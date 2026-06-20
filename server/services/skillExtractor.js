/**
 * skillExtractor.js
 *
 * HOW IT WORKS (viva-ready explanation):
 * ─────────────────────────────────────────────────────────────────────────────
 * We use a TWO-PASS extraction strategy so we catch skills whether they are
 * listed explicitly OR mentioned informally in descriptions:
 *
 * PASS 1 — Direct substring matching on the Skills section text.
 *   We lowercase the section content, then scan for every taxonomy skill as a
 *   substring.  Multi-word skills ("react native", "scikit-learn") are handled
 *   naturally because we match the full phrase, not individual tokens.
 *   Confidence = 1.0 (the candidate explicitly listed the skill).
 *
 * PASS 2 — Token + stem matching on description sections (Experience, Projects).
 *   a) compromise.js parses each description sentence and extracts noun phrases.
 *      This catches phrases like "built with TensorFlow" where "TensorFlow" is
 *      a proper-noun that simple tokenization might split or miss.
 *   b) natural.js WordTokenizer splits text into individual tokens.
 *   c) natural.js PorterStemmer reduces each token to its root so that
 *      "reactjs", "react.js", "React" all stem to the same root as "react".
 *   d) We match stemmed tokens against pre-stemmed taxonomy entries.
 *   Confidence = 0.7 (inferred from context — less certain than explicit mention).
 *
 * Why natural.js + compromise.js instead of a full LLM?
 *   Dependency-light, runs offline, deterministic output.  A real LLM/embedding
 *   model (e.g. text-embedding-3-small + cosine similarity) would give higher
 *   recall for paraphrased skills but adds API cost and latency.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const natural    = require('natural');
const nlp        = require('compromise');
const taxonomy   = require('../data/skillTaxonomy.json');

// ─── PRE-PROCESSING: build stemmed lookup tables once at module load ──────────
const tokenizer = new natural.WordTokenizer();
const stemmer   = natural.PorterStemmer;

/**
 * Build a map of:  stemmedSkillKey → { canonical, category }
 * so matching during extraction is O(1) per token.
 *
 * For multi-word skills we keep the original phrase (not stemmed) as a
 * separate "phrase list" for substring matching.
 */
const buildLookupTables = () => {
  const stemmedMap  = {};  // stemmedToken → { canonical, category }
  const phraseList  = [];  // { phrase, category, canonical } — multi-word skills

  for (const [category, skills] of Object.entries(taxonomy)) {
    for (const skill of skills) {
      if (skill.includes(' ') || skill.includes('.') || skill.includes('+') || skill.includes('#')) {
        // Multi-word or punctuated skill → phrase matching
        phraseList.push({ phrase: skill.toLowerCase(), category, canonical: skill });
      } else {
        // Single token → stem and index
        const stemmed = stemmer.stem(skill.toLowerCase());
        if (!stemmedMap[stemmed]) {
          stemmedMap[stemmed] = { canonical: skill, category };
        }
      }
    }
  }

  return { stemmedMap, phraseList };
};

const { stemmedMap, phraseList } = buildLookupTables();

// ─── PASS 1: skills section — direct phrase + token matching ─────────────────

/**
 * extractFromSkillsSection
 * Finds every taxonomy skill mentioned in the explicit skills section text.
 * Returns array of { name, category, source:'skills_section', confidence:1 }
 */
const extractFromSkillsSection = (text) => {
  const lower   = text.toLowerCase();
  const found   = {};  // canonical → entry (deduplicates)

  // 1a. Phrase matching (handles multi-word + punctuated skills)
  for (const { phrase, category, canonical } of phraseList) {
    if (lower.includes(phrase)) {
      found[canonical] = { name: canonical, category, source: 'skills_section', confidence: 1.0 };
    }
  }

  // 1b. Token matching for single-word skills
  const tokens = tokenizer.tokenize(lower);
  for (const token of tokens) {
    const stemmed = stemmer.stem(token);
    const match   = stemmedMap[stemmed];
    if (match && !found[match.canonical]) {
      found[match.canonical] = {
        name:       match.canonical,
        category:   match.category,
        source:     'skills_section',
        confidence: 1.0,
      };
    }
  }

  return Object.values(found);
};

// ─── PASS 2: description sections — NLP-assisted extraction ──────────────────

/**
 * extractFromDescriptions
 * Scans Experience/Projects/Internship text for skill mentions.
 * Uses compromise.js noun-phrase extraction + natural.js token stemming.
 * Returns array of { name, category, source:'description', confidence:0.7 }
 */
const extractFromDescriptions = (text) => {
  const lower  = text.toLowerCase();
  const found  = {};

  // 2a. compromise.js — extract noun phrases (catches proper-noun tech names
  //     like "TensorFlow", "PostgreSQL" that tokenizers split or lowercase poorly)
  const doc         = nlp(text);
  const nounPhrases = doc.nouns().out('array');  // ["React", "Node.js", ...]

  for (const phrase of nounPhrases) {
    const phraseLower = phrase.toLowerCase().trim();

    // Check against multi-word phrase list first
    for (const { phrase: p, category, canonical } of phraseList) {
      if (phraseLower.includes(p) && !found[canonical]) {
        found[canonical] = { name: canonical, category, source: 'description', confidence: 0.7 };
      }
    }

    // Check individual tokens from the noun phrase
    const tokens = tokenizer.tokenize(phraseLower);
    for (const token of tokens) {
      const stemmed = stemmer.stem(token);
      const match   = stemmedMap[stemmed];
      if (match && !found[match.canonical]) {
        found[match.canonical] = {
          name:       match.canonical,
          category:   match.category,
          source:     'description',
          confidence: 0.7,
        };
      }
    }
  }

  // 2b. Also do full phrase scan on raw lowercased text
  //     (covers cases where compromise misses a tech term)
  for (const { phrase: p, category, canonical } of phraseList) {
    if (lower.includes(p) && !found[canonical]) {
      found[canonical] = { name: canonical, category, source: 'description', confidence: 0.7 };
    }
  }

  // 2c. Full token scan of the description text
  const allTokens = tokenizer.tokenize(lower);
  for (const token of allTokens) {
    const stemmed = stemmer.stem(token);
    const match   = stemmedMap[stemmed];
    if (match && !found[match.canonical]) {
      found[match.canonical] = {
        name:       match.canonical,
        category:   match.category,
        source:     'description',
        confidence: 0.7,
      };
    }
  }

  return Object.values(found);
};

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

/**
 * extractSkills(sections)
 *
 * @param  {Array}  sections  — [{label, content}] from resumeParser.detectSections
 * @returns {Object} categorized skill profile:
 *   {
 *     languages, frontend, backend, databases, cloud, tools, aiml,
 *     allSkills  // flat deduplicated list of canonical skill names
 *   }
 *
 * Each entry in a category array: { name, source, confidence }
 * source is upgraded to 'both' if the skill appears in BOTH passes.
 */
const extractSkills = (sections) => {
  // Separate sections by type
  const skillsSectionText = sections
    .filter((s) => s.label === 'skills' || s.label === 'languages')
    .map((s) => s.content)
    .join('\n');

  const descriptionText = sections
    .filter((s) => ['experience', 'projects', 'certifications', 'summary'].includes(s.label))
    .map((s) => s.content)
    .join('\n');

  // Run both passes
  const fromSkills       = extractFromSkillsSection(skillsSectionText);
  const fromDescriptions = extractFromDescriptions(descriptionText);

  // Merge: if a skill appears in both passes, upgrade source to 'both'
  // and keep confidence = 1.0 (explicit mention takes precedence)
  const merged = {}; // canonical → entry

  for (const entry of fromSkills) {
    merged[entry.name] = { ...entry };
  }

  for (const entry of fromDescriptions) {
    if (merged[entry.name]) {
      // Already found in skills section — upgrade source
      merged[entry.name].source = 'both';
    } else {
      merged[entry.name] = { ...entry };
    }
  }

  // Bucket results into taxonomy categories
  const result = {
    languages:  [],
    frontend:   [],
    backend:    [],
    databases:  [],
    cloud:      [],
    tools:      [],
    aiml:       [],
    allSkills:  [],
  };

  for (const entry of Object.values(merged)) {
    const bucket = entry.category;
    if (result[bucket]) {
      result[bucket].push({
        name:       entry.name,
        source:     entry.source,
        confidence: entry.confidence,
      });
      result.allSkills.push(entry.name);
    }
  }

  // Sort each bucket by confidence desc, then name asc
  const categories = ['languages', 'frontend', 'backend', 'databases', 'cloud', 'tools', 'aiml'];
  for (const cat of categories) {
    result[cat].sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
  }

  result.allSkills = [...new Set(result.allSkills)].sort();

  return result;
};

module.exports = { extractSkills };
