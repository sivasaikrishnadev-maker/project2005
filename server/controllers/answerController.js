const Answer   = require('../models/Answer');
const Question = require('../models/Question');
const InterviewSession = require('../models/InterviewSession');
const { evaluateAnswer } = require('../services/answerEvaluator');

/**
 * POST /api/answers/submit
 * Accepts a typed answer, evaluates it, persists the result.
 * Body: { sessionId, questionId, answerText }
 */
const submitAnswer = async (req, res, next) => {
  try {
    const { sessionId, questionId, answerText } = req.body;
    if (!sessionId || !questionId || !answerText) {
      const e = new Error('sessionId, questionId and answerText are required');
      e.statusCode = 400; return next(e);
    }

    const question = await Question.findById(questionId);
    if (!question) { const e = new Error('Question not found'); e.statusCode = 404; return next(e); }

    // Run the evaluation pipeline
    const evaluation = evaluateAnswer(answerText, question);

    // Upsert — allow re-submission (overwrites previous answer for same question in session)
    const answer = await Answer.findOneAndUpdate(
      { session: sessionId, question: questionId, user: req.user._id },
      {
        user:            req.user._id,
        session:         sessionId,
        question:        questionId,
        answerText,
        score:           evaluation.score,
        keywordsMatched: evaluation.keywordsMatched,
        rubricCovered:   evaluation.rubricCovered,
        strengths:       evaluation.strengths,
        weaknesses:      evaluation.weaknesses,
        recommendations: evaluation.recommendations,
        evaluatedAt:     new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, answer });
  } catch (err) { next(err); }
};

/**
 * GET /api/answers/session/:sessionId
 * Returns all evaluated answers for a session.
 */
const getSessionAnswers = async (req, res, next) => {
  try {
    const answers = await Answer.find({
      session: req.params.sessionId,
      user:    req.user._id,
    }).populate('question', 'text type skill difficulty referenceAnswer');

    const avgScore = answers.length
      ? Math.round((answers.reduce((s, a) => s + (a.score || 0), 0) / answers.length) * 10) / 10
      : 0;

    res.json({ success: true, count: answers.length, avgScore, answers });
  } catch (err) { next(err); }
};

/**
 * GET /api/answers/:id
 * Single answer detail.
 */
const getAnswer = async (req, res, next) => {
  try {
    const answer = await Answer.findOne({ _id: req.params.id, user: req.user._id })
      .populate('question');
    if (!answer) { const e = new Error('Answer not found'); e.statusCode = 404; return next(e); }
    res.json({ success: true, answer });
  } catch (err) { next(err); }
};

module.exports = { submitAnswer, getSessionAnswers, getAnswer };
