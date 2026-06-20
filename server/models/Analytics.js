const mongoose = require('mongoose');

// One skill gap entry: skill required by the target role but weak/missing
const skillGapSchema = new mongoose.Schema(
  {
    skill:           { type: String, required: true },
    requiredLevel:   { type: Number, min: 0, max: 10 }, // expected proficiency
    currentLevel:    { type: Number, min: 0, max: 10 }, // inferred from answers
    gap:             { type: Number },                   // requiredLevel - currentLevel
  },
  { _id: false }
);

// Company readiness: how prepared the user is for a specific company's stack
const companyReadinessSchema = new mongoose.Schema(
  {
    company:  { type: String, required: true },
    score:    { type: Number, min: 0, max: 100 }, // 0–100
    matched:  [String], // skills user has that the company values
    missing:  [String], // skills the company wants that user lacks
  },
  { _id: false }
);

// One entry in the performance trend (one per completed session)
const trendPointSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession' },
    date:      { type: Date },
    avgScore:  { type: Number, min: 0, max: 10 }, // average answer score
  },
  { _id: false }
);

// Heatmap cell: skill × session score
const heatmapCellSchema = new mongoose.Schema(
  {
    skill:    { type: String },
    sessions: [
      {
        sessionId: { type: mongoose.Schema.Types.ObjectId },
        score:     { type: Number, min: 0, max: 10 },
      },
    ],
  },
  { _id: false }
);

const analyticsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Analytics are recomputed after each session — store the triggering session
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession',
    },

    // Composite score 0–100 (Phase 9 formula)
    readinessScore: { type: Number, min: 0, max: 100, default: 0 },

    skillGaps:        [skillGapSchema],
    companyReadiness: [companyReadinessSchema],

    // Ordered list of skills/topics to study next
    roadmap: [String],

    // Skill confidence heatmap data
    heatmap: [heatmapCellSchema],

    // One point per completed session for the trend chart
    performanceTrend: [trendPointSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Analytics', analyticsSchema);
