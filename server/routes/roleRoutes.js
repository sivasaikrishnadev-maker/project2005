const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { suggestRoles, selectRole } = require('../controllers/roleController');

router.use(protect);

router.get('/suggest/:resumeId', suggestRoles); // GET  /api/roles/suggest/:resumeId
router.post('/select',           selectRole);   // POST /api/roles/select

module.exports = router;
