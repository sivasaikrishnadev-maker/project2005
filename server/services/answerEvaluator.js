/**
 * answerEvaluator.js
 *
 * SCORING PIPELINE (viva-ready explanation):
 * ─────────────────────────────────────────────────────────────────────────────
 * Three independent scoring signals are computed then blended:
 *
 * 1. KEYWORD SCORE (40% weight)
 *    Extract important keywords from the reference answer using natural.js
 *    TF-IDF logic (stop-words removed, stems compared).  Count how many of
 *    those keywords appear in the candidate's answer.
 *    keywordScore = matchedKeywords / totalKeywords
 *
 * 2. RUBRIC SCORE (40% weight)
 *    Each question has a rubric array of {criterion, weight} pairs.
 *    For each criterion we check whether the candidate's answer contains
 *    the key concept (keyword match on the criterion text against the answer).
 *    rubricScore = sum(weight of covered criteria) / sum(all weights)
 *
 * 3. COSINE SIMILARITY SCORE (20% weight)
 *    Build TF term-frequency vectors for the reference answer and the
 *    candidate answer (after stop-word removal and stemming).
 *    cosineSim = dot(v_ref, v_cand) / (|v_ref| * |v_cand|)
 *    This rewards answers that use similar vocabulary and phrasing to the
 *    reference even when exact keywords differ.
 *
 * FINAL SCORE = (keywordScore×0.40 + rubricScore×0.40 + cosineScore×0.20) × 10
 * Rounded to 1 decimal, capped at 10.
 *
 * WHY NOT an LLM? An LLM (e.g. GPT-4) would give semantic scoring and catch
 * paraphrased correct answers better.  This rule-based approach is
 * deterministic, offline, and explainable — ideal for a viva defence.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const natural = require('natural');

const tokenizer = new natural.WordTokenizer();
const stemmer   = natural.PorterStemmer;

// Common English stop-words to filter before building term vectors
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','was','are','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'it','its','this','that','these','those','i','you','he','she','we',
  'they','what','which','who','when','where','how','not','no','as','if',
  'so','then','than','more','also','can','there','their','our','your',
]);

// ─── SHARED UTILITIES ─────────────────────────────────────────────────────────

/** Tokenise → remove stop-words → stem each token */
const processText = (text) => {
  const tokens = tokenizer.tokenize((text || '').toLowerCase());
  return tokens
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
    .map((t) => stemmer.stem(t));
};

/** Build a term-frequency map: { stem: count } */
const buildTFVector = (stems) => {
  const vec = {};
  for (const s of stems) vec[s] = (vec[s] || 0) + 1;
  return vec;
};

/** Cosine similarity between two TF vectors */
const cosineSimilarity = (vecA, vecB) => {
  const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0, magA = 0, magB = 0;
  for (const term of allTerms) {
    const a = vecA[term] || 0;
    const b = vecB[term] || 0;
    dot  += a * b;
    magA += a * a;
    magB += b * b;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

// ─── SIGNAL 1: KEYWORD SCORE ─────────────────────────────────────────────────

const computeKeywordScore = (referenceAnswer, candidateAnswer) => {
  const refStems  = processText(referenceAnswer);
  const candStems = new Set(processText(candidateAnswer));

  if (refStems.length === 0) return { score: 0, matched: [], total: 0 };

  // Deduplicate reference stems so one keyword isn't counted twice
  const uniqueRefStems = [...new Set(refStems)];
  const matched = uniqueRefStems.filter((s) => candStems.has(s));

  return {
    score:   matched.length / uniqueRefStems.length,
    matched: matched.slice(0, 10), // top 10 for feedback display
    total:   uniqueRefStems.length,
  };
};

// ─── SIGNAL 2: RUBRIC SCORE ──────────────────────────────────────────────────

const computeRubricScore = (rubric, candidateAnswer) => {
  if (!rubric || rubric.length === 0) return { score: 0, covered: [], total: 0 };

  const candStems = new Set(processText(candidateAnswer));
  const candLower = candidateAnswer.toLowerCase();

  let earned = 0;
  let total  = 0;
  const covered = [];

  for (const { criterion, weight } of rubric) {
    const w = weight || 1;
    total += w;

    // Check if any key stem from the criterion appears in the candidate answer
    // OR if the criterion phrase appears directly (handles short phrases)
    const critStems = processText(criterion);
    const directMatch = candLower.includes(criterion.toLowerCase().split(' ')[0]);
    const stemMatch   = critStems.some((s) => candStems.has(s));

    if (stemMatch || directMatch) {
      earned += w;
      covered.push(criterion);
    }
  }

  return {
    score:   total > 0 ? earned / total : 0,
    covered,
    total:   rubric.length,
  };
};

// ─── SIGNAL 3: COSINE SIMILARITY ─────────────────────────────────────────────

const computeCosineScore = (referenceAnswer, candidateAnswer) => {
  const refVec  = buildTFVector(processText(referenceAnswer));
  const candVec = buildTFVector(processText(candidateAnswer));
  return cosineSimilarity(refVec, candVec);
};

// ─── FEEDBACK GENERATOR ──────────────────────────────────────────────────────

const generateFeedback = (keywordResult, rubricResult, finalScore, question) => {
  const strengths       = [];
  const weaknesses      = [];
  const recommendations = [];

  // Strengths
  if (keywordResult.score >= 0.6)
    strengths.push('Good use of relevant technical terminology.');
  if (rubricResult.covered.length > 0)
    strengths.push(`Covered key concepts: ${rubricResult.covered.slice(0, 3).join(', ')}.`);
  if (finalScore >= 7)
    strengths.push('Answer demonstrates solid understanding of the topic.');
  if (finalScore >= 9)
    strengths.push('Excellent depth and accuracy — near-complete coverage.');

  // Weaknesses
  if (keywordResult.score < 0.4)
    weaknesses.push('Missing important technical keywords from the expected answer.');
  const missedRubric = (question.rubric || [])
    .map((r) => r.criterion)
    .filter((c) => !rubricResult.covered.includes(c));
  if (missedRubric.length > 0)
    weaknesses.push(`Did not address: ${missedRubric.slice(0, 2).join('; ')}.`);
  if (finalScore < 5)
    weaknesses.push('Answer lacks sufficient detail and technical depth.');

  // Recommendations
  if (keywordResult.score < 0.5)
    recommendations.push('Review the reference answer and focus on the key concepts highlighted.');
  if (missedRubric.length > 0)
    recommendations.push(`Study these specific areas: ${missedRubric.slice(0, 2).join(', ')}.`);
  if (finalScore < 7)
    recommendations.push('Practice explaining this concept aloud — aim for a structured 2-3 minute answer.');
  if (question.tags && question.tags.length > 0)
    recommendations.push(`Strengthen your knowledge of: ${question.tags.slice(0, 3).join(', ')}.`);

  return { strengths, weaknesses, recommendations };
};

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

/**
 * evaluateAnswer
 * @param {string} candidateAnswer  — the user's typed answer
 * @param {Object} question         — full Question document (has referenceAnswer, rubric)
 * @returns {Object} evaluation result
 */
const evaluateAnswer = (candidateAnswer, question) => {
  if (!candidateAnswer || candidateAnswer.trim().length < 5) {
    return {
      score: 0,
      keywordsMatched: [],
      rubricCovered:   [],
      strengths:       [],
      weaknesses:      ['No answer provided or answer too short.'],
      recommendations: ['Attempt every question — even a partial answer scores points.'],
    };
  }

  const kwResult  = computeKeywordScore(question.referenceAnswer, candidateAnswer);
  const rubResult = computeRubricScore(question.rubric, candidateAnswer);
  const cosScore  = computeCosineScore(question.referenceAnswer, candidateAnswer);

  // Blended score: keyword 40%, rubric 40%, cosine 20%
  const blended    = kwResult.score * 0.40 + rubResult.score * 0.40 + cosScore * 0.20;
  const finalScore = Math.min(Math.round(blended * 100) / 10, 10); // 0–10, 1dp

  const feedback = generateFeedback(kwResult, rubResult, finalScore, question);

  return {
    score:           finalScore,
    keywordsMatched: kwResult.matched,
    rubricCovered:   rubResult.covered,
    ...feedback,
  };
};

module.exports = { evaluateAnswer };
