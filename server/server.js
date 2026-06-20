require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const connectDB   = require('./config/db');

const app = express();

// Connect to MongoDB Atlas
connectDB();

// ─── GLOBAL MIDDLEWARE ────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// Rate limiter: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please try again later.' },
});
app.use('/api', limiter);

// Stricter limiter on auth endpoints to slow brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts — please try again later.' },
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Interview Prep API is running', env: process.env.NODE_ENV });
});

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, require('./routes/authRoutes'));
app.use('/api/resume',    require('./routes/resumeRoutes'));
app.use('/api/skills',    require('./routes/skillRoutes'));
app.use('/api/roles',     require('./routes/roleRoutes'));
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/sessions',  require('./routes/sessionRoutes'));
app.use('/api/answers',   require('./routes/answerRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`));
