/**
 * resumeParser.js
 *
 * Responsible for two things:
 *   1. extractText(filePath, fileType) → raw string of all resume text
 *   2. detectSections(rawText)         → [{label, content}, ...] named sections
 *
 * Why separate these?  The NLP skill-extractor (Phase 5) needs BOTH the raw
 * text (to scan descriptions) AND the labelled sections (to know which skills
 * came from the explicit Skills section vs. from project descriptions).
 */

const fs      = require('fs');
const path    = require('path');
const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');

// ─── 1. TEXT EXTRACTION ──────────────────────────────────────────────────────

/**
 * extractText
 * Dispatches to the correct extractor based on fileType.
 * Returns a single string of the full resume text.
 */
const extractText = async (filePath, fileType) => {
  switch (fileType) {
    case 'pdf':  return extractPdf(filePath);
    case 'docx': return extractDocx(filePath);
    case 'doc':  return extractDoc(filePath);
    case 'txt':  return extractTxt(filePath);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
};

// PDF → text via pdf-parse
// pdf-parse reads the raw PDF buffer and returns structured page data.
const extractPdf = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const data   = await pdfParse(buffer);
  return data.text || '';
};

// DOCX → text via mammoth (mammoth.extractRawText strips all formatting)
const extractDocx = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || '';
};

// DOC → mammoth handles older .doc files on a best-effort basis.
// NOTE: mammoth is primarily designed for .docx (Open XML). Older binary .doc
// may partially parse.  A production upgrade path would be LibreOffice or
// textract, but mammoth covers most modern exports saved as .doc.
const extractDoc = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  } catch {
    // If mammoth can't handle the binary format, return empty so the controller
    // marks parseStatus = 'failed' and the user is asked to re-upload as DOCX/PDF.
    return '';
  }
};

// TXT → plain fs read (assume UTF-8)
const extractTxt = (filePath) => {
  return fs.readFileSync(filePath, 'utf8');
};

// ─── 2. SECTION DETECTION ────────────────────────────────────────────────────

/**
 * Section detection strategy:
 *   - We scan each line of the raw text for a line that looks like a section
 *     header (short, all-caps or title-cased, matches a known keyword).
 *   - Everything between two consecutive headers belongs to the first header's
 *     section.
 *   - Unmatched leading content is labelled "header" (name / contact info).
 *
 * Why regex over NLP here?  Section headers are structural, not semantic —
 * they are short, uppercase, and predictable.  NLP adds no benefit and
 * slows the pipeline.  The NLP work happens in Phase 5.
 */

// Map from canonical label → all spelling/phrasing variants we recognise
const SECTION_PATTERNS = {
  summary:      /^(summary|objective|profile|about me|professional summary|career objective)/i,
  skills:       /^(skills|technical skills|core competencies|technologies|tech stack|key skills)/i,
  experience:   /^(experience|work experience|professional experience|employment|internship|internships|work history)/i,
  projects:     /^(projects|personal projects|academic projects|key projects|project experience)/i,
  education:    /^(education|academic background|qualifications|academic qualifications)/i,
  certifications: /^(certifications?|certificates?|courses?|training|achievements?|awards?)/i,
  languages:    /^(languages?|programming languages?)/i,
};

/**
 * detectSections
 * Returns an array of { label: string, content: string } objects.
 * Order mirrors the order they appear in the resume.
 */
const detectSections = (rawText) => {
  const lines    = rawText.split('\n');
  const sections = [];
  let currentLabel   = 'header'; // content before the first recognised header
  let currentLines   = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue; // skip blank lines (they don't belong to a section)

    const matched = matchSectionHeader(trimmed);

    if (matched) {
      // Save the previous section before starting a new one
      if (currentLines.length > 0) {
        sections.push({ label: currentLabel, content: currentLines.join('\n').trim() });
      }
      currentLabel = matched;
      currentLines = [];
    } else {
      currentLines.push(trimmed);
    }
  }

  // Push the final section
  if (currentLines.length > 0) {
    sections.push({ label: currentLabel, content: currentLines.join('\n').trim() });
  }

  return sections;
};

/**
 * matchSectionHeader
 * Returns the canonical label if the line looks like a section header,
 * otherwise returns null.
 *
 * A line is treated as a header when:
 *   a) it is short (≤ 60 chars) — headers are rarely long sentences, AND
 *   b) it matches one of the SECTION_PATTERNS above.
 */
const matchSectionHeader = (line) => {
  if (line.length > 60) return null; // long lines are body text, not headers

  for (const [label, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(line)) return label;
  }
  return null;
};

module.exports = { extractText, detectSections };
