const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession',
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },

    answerText: { type: String, required: true },

    // Evaluation output from Phase 8 engine
    score: { type: Number, min: 0, max: 10, default: null },

    // Keyword hits found in the answer
    keywordsMatched: [String],
    // Rubric criteria the answer satisfied
    rubricCovered:   [String],

    strengths:       [String], // bullet points of what was done well
    weaknesses:      [String], // bullet points of gaps
    recommendations: [String], // actionable improvement tips

    evaluatedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Answer', answerSchema);
