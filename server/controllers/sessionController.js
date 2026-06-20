const InterviewSession = require('../models/InterviewSession');

/** GET /api/sessions — all sessions for the logged-in user */
const getMySessions = async (req, res, next) => {
  try {
    const sessions = await InterviewSession.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('resume', 'originalName')
      .select('-questions');
    res.json({ success: true, sessions });
  } catch (err) { next(err); }
};

/** GET /api/sessions/:id */
const getSession = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, user: req.user._id })
      .populate('questions');
    if (!session) { const e = new Error('Session not found'); e.statusCode = 404; return next(e); }
    res.json({ success: true, session });
  } catch (err) { next(err); }
};

/** PATCH /api/sessions/:id/complete — mark session completed */
const completeSession = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );
    if (!session) { const e = new Error('Session not found'); e.statusCode = 404; return next(e); }
    res.json({ success: true, session });
  } catch (err) { next(err); }
};

module.exports = { getMySessions, getSession, completeSession };
