const Resume       = require('../models/Resume');
const SkillProfile = require('../models/SkillProfile');
const { extractSkills } = require('../services/skillExtractor');

/**
 * POST /api/skills/extract/:resumeId
 * Runs the NLP extraction pipeline on a parsed resume and saves a SkillProfile.
 * Idempotent — if a profile already exists for this resume it is replaced.
 */
const extractAndSave = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.resumeId, user: req.user._id });

    if (!resume) {
      const err = new Error('Resume not found');
      err.statusCode = 404;
      return next(err);
    }

    if (resume.parseStatus !== 'success') {
      const err = new Error('Resume has not been successfully parsed yet');
      err.statusCode = 400;
      return next(err);
    }

    // Run the two-pass NLP extraction
    const extracted = extractSkills(resume.sections);

    // Upsert — one SkillProfile per resume
    const profile = await SkillProfile.findOneAndUpdate(
      { user: req.user._id, resume: resume._id },
      {
        user:      req.user._id,
        resume:    resume._id,
        languages: extracted.languages,
        frontend:  extracted.frontend,
        backend:   extracted.backend,
        databases: extracted.databases,
        cloud:     extracted.cloud,
        tools:     extracted.tools,
        aiml:      extracted.aiml,
        allSkills: extracted.allSkills,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      profile: {
        id:        profile._id,
        languages: profile.languages,
        frontend:  profile.frontend,
        backend:   profile.backend,
        databases: profile.databases,
        cloud:     profile.cloud,
        tools:     profile.tools,
        aiml:      profile.aiml,
        allSkills: profile.allSkills,
        totalSkillsFound: profile.allSkills.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/skills/:resumeId
 * Returns the existing SkillProfile for a given resume.
 */
const getSkillProfile = async (req, res, next) => {
  try {
    const profile = await SkillProfile.findOne({
      resume: req.params.resumeId,
      user:   req.user._id,
    });

    if (!profile) {
      const err = new Error('Skill profile not found — run extraction first');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
};

module.exports = { extractAndSave, getSkillProfile };
