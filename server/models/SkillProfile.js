const mongoose = require('mongoose');

// One entry per skill, storing name + where it was found
const skillEntrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // "skills_section" = explicit skills list; "description" = inferred from
    // project/experience text; "both" = found in both places
    source: {
      type: String,
      enum: ['skills_section', 'description', 'both'],
      default: 'skills_section',
    },
    confidence: { type: Number, min: 0, max: 1, default: 1 }, // 0–1
  },
  { _id: false }
);

const skillProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
    },
    // Skills bucketed into taxonomy categories (Phase 5)
    languages:  [skillEntrySchema],
    frontend:   [skillEntrySchema],
    backend:    [skillEntrySchema],
    databases:  [skillEntrySchema],
    cloud:      [skillEntrySchema],
    tools:      [skillEntrySchema],
    aiml:       [skillEntrySchema],
    // Flat list of all skill names for quick lookup / querying
    allSkills: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model('SkillProfile', skillProfileSchema);
