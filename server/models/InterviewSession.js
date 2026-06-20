const mongoose = require('mongoose');

const interviewSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
    },
    skillProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillProfile',
    },

    // Roles the system suggested for this user (Phase 6 output)
    suggestedRoles: [String],
    // Role the user picked to focus this session on
    selectedRole: { type: String, default: '' },

    // Ordered list of questions assigned to this session
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],

    status: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'pending',
    },

    startedAt:   { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
