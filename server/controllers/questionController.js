const Question         = require('../models/Question');
const SkillProfile     = require('../models/SkillProfile');
const InterviewSession = require('../models/InterviewSession');
const { seedQuestionBank, buildSession } = require('../services/questionGenerator');

/**
 * POST /api/questions/seed
 * Seeds the question bank from JSON files into MongoDB.
 * Safe to run multiple times — uses upsert so no duplicates.
 */
const seed = async (req, res, next) => {
  try {
    const result = await seedQuestionBank();
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/questions/generate
 * Generates a personalised question set for a session.
 * Body: { sessionId, resumeId }
 */
const generate = async (req, res, next) => {
  try {
    const { sessionId, resumeId } = req.body;

    const session = await InterviewSession.findOne({
      _id:  sessionId,
      user: req.user._id,
    });
    if (!session) {
      const err = new Error('Session not found');
      err.statusCode = 404;
      return next(err);
    }

    const profile = await SkillProfile.findOne({
      resume: resumeId,
      user:   req.user._id,
    });
    if (!profile) {
      const err = new Error('Skill profile not found');
      err.statusCode = 404;
      return next(err);
    }

    const updated = await buildSession(sessionId, profile, session.selectedRole);

    res.json({
      success:    true,
      sessionId:  updated._id,
      totalQuestions: updated.questions.length,
      questions:  updated.questions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/questions/session/:sessionId
 * Returns all questions for a session (for the interview UI).
 */
const getSessionQuestions = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({
      _id:  req.params.sessionId,
      user: req.user._id,
    }).populate('questions');

    if (!session) {
      const err = new Error('Session not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, questions: session.questions, status: session.status });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/questions/bank
 * Returns all questions in the bank (admin/debug view).
 * Accepts query params: type, skill, role, difficulty
 */
const getBank = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type)       filter.type       = req.query.type;
    if (req.query.skill)      filter.skill       = req.query.skill;
    if (req.query.role)       filter.role        = req.query.role;
    if (req.query.difficulty) filter.difficulty  = req.query.difficulty;

    const questions = await Question.find(filter).sort({ type: 1, difficulty: 1 });
    res.json({ success: true, count: questions.length, questions });
  } catch (err) {
    next(err);
  }
};

module.exports = { seed, generate, getSessionQuestions, getBank };
