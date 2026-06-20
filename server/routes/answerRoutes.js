const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { submitAnswer, getSessionAnswers, getAnswer } = require('../controllers/answerController');

router.use(protect);
router.post('/submit',              submitAnswer);        // POST /api/answers/submit
router.get('/session/:sessionId',   getSessionAnswers);   // GET  /api/answers/session/:id
router.get('/:id',                  getAnswer);           // GET  /api/answers/:id

module.exports = router;
