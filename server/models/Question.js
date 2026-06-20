const mongoose = require('mongoose');

// One rubric criterion: what concept the evaluator checks for
const rubricItemSchema = new mongoose.Schema(
  {
    criterion: { type: String, required: true }, // e.g. "mentions time complexity"
    weight: { type: Number, default: 1 },        // relative importance
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },

    type: {
      type: String,
      enum: ['mcq', 'short', 'descriptive', 'scenario', 'project', 'resume', 'role', 'hr'],
      required: true,
    },

    // Skill or role this question targets (used for session assembly)
    skill: { type: String, default: '' },
    role:  { type: String, default: '' },

    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },

    // MCQ only
    options: [String],      // ["A. ...", "B. ...", "C. ...", "D. ..."]
    correctOption: String,  // "A" / "B" / "C" / "D"

    // Used by the answer-evaluation engine (Phase 8)
    referenceAnswer: { type: String, default: '' },
    rubric: [rubricItemSchema],

    tags: [String], // e.g. ["arrays", "sorting", "frontend"]

    // false = from seed bank; true = AI/dynamically generated
    isDynamic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', questionSchema);
