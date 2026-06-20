const SkillProfile     = require('../models/SkillProfile');
const InterviewSession = require('../models/InterviewSession');
const { identifyRoles } = require('../services/roleIdentifier');

/**
 * GET /api/roles/:resumeId
 * Loads the SkillProfile for a resume, runs role identification,
 * and returns the top 5 matched roles.
 */
const suggestRoles = async (req, res, next) => {
  try {
    const profile = await SkillProfile.findOne({
      resume: req.params.resumeId,
      user:   req.user._id,
    });

    if (!profile) {
      const err = new Error('Skill profile not found — run skill extraction first');
      err.statusCode = 404;
      return next(err);
    }

    const roles = identifyRoles(profile, 5);

    res.json({
      success: true,
      totalSkills: profile.allSkills.length,
      suggestedRoles: roles,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/roles/select
 * User picks a role to focus their interview session on.
 * Creates a new InterviewSession with suggestedRoles + selectedRole populated.
 * Body: { resumeId, skillProfileId, selectedRole, suggestedRoles[] }
 */
const selectRole = async (req, res, next) => {
  try {
    const { resumeId, skillProfileId, selectedRole, suggestedRoles } = req.body;

    if (!selectedRole) {
      const err = new Error('selectedRole is required');
      err.statusCode = 400;
      return next(err);
    }

    const session = await InterviewSession.create({
      user:           req.user._id,
      resume:         resumeId,
      skillProfile:   skillProfileId,
      suggestedRoles: suggestedRoles || [],
      selectedRole,
      status:         'pending',
    });

    res.status(201).json({ success: true, session });
  } catch (err) {
    next(err);
  }
};

module.exports = { suggestRoles, selectRole };
