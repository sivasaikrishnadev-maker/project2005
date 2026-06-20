const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { extractAndSave, getSkillProfile } = require('../controllers/skillController');

router.use(protect);

router.post('/extract/:resumeId', extractAndSave); // POST /api/skills/extract/:resumeId
router.get('/:resumeId',          getSkillProfile); // GET  /api/skills/:resumeId

module.exports = router;
