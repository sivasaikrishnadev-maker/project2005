const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const {
  uploadMiddleware,
  uploadResume,
  getMyResumes,
  getResumeById,
  deleteResume,
} = require('../controllers/resumeController');

// All resume routes require a valid JWT
router.use(protect);

router.post('/',    uploadMiddleware, uploadResume); // POST   /api/resume
router.get('/',     getMyResumes);                   // GET    /api/resume
router.get('/:id',  getResumeById);                  // GET    /api/resume/:id
router.delete('/:id', deleteResume);                 // DELETE /api/resume/:id

module.exports = router;
