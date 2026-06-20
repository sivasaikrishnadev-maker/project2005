const Analytics        = require('../models/Analytics');
const Answer           = require('../models/Answer');
const InterviewSession = require('../models/InterviewSession');
const SkillProfile     = require('../models/SkillProfile');
const { computeAnalytics } = require('../services/analyticsEngine');

/**
 * POST /api/analytics/generate
 * Runs all analytics computations for a completed session and saves/updates
 * the Analytics document for the user.
 * Body: { sessionId, resumeId }
 */
const generateAnalytics = async (req, res, next) => {
  try {
    const { sessionId, resumeId } = req.body;

    const session = await InterviewSession.findOne({ _id: sessionId, user: req.user._id });
    if (!session) { const e = new Error('Session not found'); e.statusCode = 404; return next(e); }

    const profile = await SkillProfile.findOne({ resume: resumeId, user: req.user._id });
    if (!profile) { const e = new Error('Skill profile not found'); e.statusCode = 404; return next(e); }

    // Fetch all answers for this session (populated with question for skill tag)
    const answers = await Answer.find({ session: sessionId, user: req.user._id })
      .populate('question', 'skill text');

    // Fetch all sessions + answers for trend and heatmap
    const allSessions = await InterviewSession.find({ user: req.user._id }).sort({ createdAt: 1 });
    const allAnswers  = await Answer.find({ user: req.user._id }).populate('question', 'skill');

    // Group all answers by sessionId
    const allAnswerMap = {};
    for (const a of allAnswers) {
      const sid = String(a.session);
      if (!allAnswerMap[sid]) allAnswerMap[sid] = [];
      allAnswerMap[sid].push(a);
    }

    const result = computeAnalytics(
      profile,
      session.selectedRole,
      answers,
      allSessions,
      allAnswerMap
    );

    // Upsert analytics record
    const analytics = await Analytics.findOneAndUpdate(
      { user: req.user._id, session: sessionId },
      { user: req.user._id, session: sessionId, ...result },
      { upsert: true, new: true }
    );

    res.json({ success: true, analytics });
  } catch (err) { next(err); }
};

/**
 * GET /api/analytics/me
 * Returns the latest analytics record for the logged-in user.
 */
const getMyAnalytics = async (req, res, next) => {
  try {
    const analytics = await Analytics.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (!analytics) {
      return res.json({ success: true, analytics: null, message: 'No analytics yet — complete a session first.' });
    }
    res.json({ success: true, analytics });
  } catch (err) { next(err); }
};

/**
 * GET /api/analytics/session/:sessionId
 * Returns analytics for a specific session.
 */
const getSessionAnalytics = async (req, res, next) => {
  try {
    const analytics = await Analytics.findOne({ session: req.params.sessionId, user: req.user._id });
    if (!analytics) { const e = new Error('Analytics not found'); e.statusCode = 404; return next(e); }
    res.json({ success: true, analytics });
  } catch (err) { next(err); }
};

module.exports = { generateAnalytics, getMyAnalytics, getSessionAnalytics };
