/**
 * questionGenerator.js
 *
 * HOW QUESTION GENERATION WORKS (viva-ready explanation):
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 1 — SEED the database with questions from JSON bank files (done once).
 *
 * Step 2 — FILTER from the database:
 *   a) MCQ / Short / Descriptive: filter by skill tags that appear in the
 *      user's allSkills list.  Broader questions (skill='') are always included.
 *   b) Scenario: filter by skill overlap OR role match.
 *   c) Project / Resume: always included — they ask about the user's own work.
 *   d) Role-specific: filter by the session's selectedRole.
 *   e) HR: always included — universal soft-skills questions.
 *
 * Step 3 — MIX by type using a configurable quota:
 *   Default 15-question session:
 *     MCQ=2, Short=3, Descriptive=3, Scenario=2, Project=2, Resume=1, Role=1, HR=2
 *
 * Step 4 — SHUFFLE within each type bucket so repeat sessions feel different.
 *
 * Step 5 — PERSIST question ObjectIds into the InterviewSession document.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Question         = require('../models/Question');
const InterviewSession = require('../models/InterviewSession');

// Default question count per type for a standard 15-question session
const DEFAULT_QUOTA = {
  mcq:         2,
  short:       3,
  descriptive: 3,
  scenario:    2,
  project:     2,
  resume:      1,
  role:        1,
  hr:          1,
};

// ─── SEED HELPER ─────────────────────────────────────────────────────────────

/**
 * seedQuestionBank
 * Loads questions from all JSON bank files and inserts them into MongoDB.
 * Uses upsert-by-text so re-running does not create duplicates.
 * Called once from the seed route (POST /api/questions/seed).
 */
const seedQuestionBank = async () => {
  const files = [
    { file: 'mcq',         type: 'mcq'         },
    { file: 'shortAnswer', type: 'short'        },
    { file: 'descriptive', type: 'descriptive'  },
    { file: 'scenario',    type: 'scenario'     },
    { file: 'projectBased',type: 'project'      },
    { file: 'resumeBased', type: 'resume'       },
    { file: 'roleSpecific',type: 'role'         },
    { file: 'hr',          type: 'hr'           },
  ];

  let inserted = 0;
  let skipped  = 0;

  for (const { file, type } of files) {
    const bank = require(`../data/questionBank/${file}.json`);

    for (const q of bank) {
      // Use findOneAndUpdate with upsert so re-seeding is safe
      const result = await Question.findOneAndUpdate(
        { text: q.text },
        { ...q, type, isDynamic: false },
        { upsert: true, new: false }
      );
      result ? skipped++ : inserted++;
    }
  }

  return { inserted, skipped };
};

// ─── FILTER HELPERS ───────────────────────────────────────────────────────────

// Fisher-Yates shuffle — randomises order within each type bucket
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * pickN
 * Shuffles an array and returns the first n items.
 */
const pickN = (arr, n) => shuffle(arr).slice(0, n);

// ─── MAIN GENERATOR ──────────────────────────────────────────────────────────

/**
 * generateQuestions
 * Assembles a personalised question set for a session.
 *
 * @param {Object} skillProfile  — from Phase 5 (has allSkills, role categories)
 * @param {string} selectedRole  — role ID chosen in Phase 6
 * @param {Object} quota         — override DEFAULT_QUOTA if needed
 * @returns {Array}              — array of Question documents
 */
const generateQuestions = async (skillProfile, selectedRole, quota = DEFAULT_QUOTA) => {
  const userSkills = new Set((skillProfile.allSkills || []).map((s) => s.toLowerCase()));

  // ── MCQ: match user skills or generic ──────────────────────────────────────
  const mcqPool = await Question.find({
    type: 'mcq',
    $or: [
      { skill: { $in: [...userSkills] } },
      { skill: '' },
    ],
  });

  // ── Short answer: match user skills ────────────────────────────────────────
  const shortPool = await Question.find({
    type: 'short',
    $or: [{ skill: { $in: [...userSkills] } }, { skill: '' }],
  });

  // ── Descriptive: match user skills ─────────────────────────────────────────
  const descPool = await Question.find({
    type: 'descriptive',
    $or: [{ skill: { $in: [...userSkills] } }, { skill: '' }],
  });

  // ── Scenario: match skills OR role ─────────────────────────────────────────
  const scenarioPool = await Question.find({
    type: 'scenario',
    $or: [
      { skill: { $in: [...userSkills] } },
      { role: selectedRole },
      { skill: '' },
    ],
  });

  // ── Project-based: always all of them (user speaks to their own projects) ──
  const projectPool = await Question.find({ type: 'project' });

  // ── Resume-based: always all of them ───────────────────────────────────────
  const resumePool = await Question.find({ type: 'resume' });

  // ── Role-specific: match selectedRole ──────────────────────────────────────
  const rolePool = await Question.find({
    type: 'role',
    role: selectedRole,
  });

  // ── HR: always all of them ─────────────────────────────────────────────────
  const hrPool = await Question.find({ type: 'hr' });

  // Pick N from each pool and flatten
  const selected = [
    ...pickN(mcqPool,      quota.mcq),
    ...pickN(shortPool,    quota.short),
    ...pickN(descPool,     quota.descriptive),
    ...pickN(scenarioPool, quota.scenario),
    ...pickN(projectPool,  quota.project),
    ...pickN(resumePool,   quota.resume),
    ...pickN(rolePool,     quota.role),
    ...pickN(hrPool,       quota.hr),
  ];

  // Final shuffle so question types aren't grouped in the session
  return shuffle(selected);
};

/**
 * buildSession
 * Generates questions and saves their IDs into the InterviewSession.
 *
 * @param {string} sessionId    — existing InterviewSession._id
 * @param {Object} skillProfile — Phase 5 output
 * @param {string} selectedRole — Phase 6 selection
 * @returns {Object}            — updated InterviewSession
 */
const buildSession = async (sessionId, skillProfile, selectedRole) => {
  const questions = await generateQuestions(skillProfile, selectedRole);
  const questionIds = questions.map((q) => q._id);

  const session = await InterviewSession.findByIdAndUpdate(
    sessionId,
    { questions: questionIds, status: 'active', startedAt: new Date() },
    { new: true }
  ).populate('questions');

  return session;
};

module.exports = { seedQuestionBank, generateQuestions, buildSession };
