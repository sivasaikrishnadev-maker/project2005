const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { seed, generate, getSessionQuestions, getBank } = require('../controllers/questionController');

router.use(protect);

router.post('/seed',                seed);                 // POST /api/questions/seed
router.post('/generate',            generate);             // POST /api/questions/generate
router.get('/session/:sessionId',   getSessionQuestions);  // GET  /api/questions/session/:id
router.get('/bank',                 getBank);              // GET  /api/questions/bank

module.exports = router;
