const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Resume = require('../models/Resume');
const { extractText, detectSections } = require('../services/resumeParser');

// Create uploads directory automatically if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── MULTER CONFIGURATION ────────────────────────────────────────────────────

// Store files on disk in server/uploads/ with a timestamp-prefixed name so
// concurrent uploads from different users never collide.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}_${req.user._id}_${safeName}`);
  },
});

// Whitelist: only these MIME types and extensions are accepted
const ALLOWED_TYPES = {
  'application/pdf':                                          'pdf',
  'application/msword':                                      'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain':                                              'txt',
};

const fileFilter = (req, file, cb) => {
  const fileType = ALLOWED_TYPES[file.mimetype];
  if (fileType) {
    file.detectedType = fileType; // attach so controller can read it
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// Export the single-file upload middleware so the router can apply it
const uploadMiddleware = upload.single('resume');

// ─── CONTROLLERS ─────────────────────────────────────────────────────────────

/**
 * POST /api/resume/upload
 * Flow: Multer saves file → extractText → detectSections → save Resume doc
 */
const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded');
      err.statusCode = 400;
      return next(err);
    }

    const fileType = ALLOWED_TYPES[req.file.mimetype];

    // Create a DB record immediately with status 'pending' so the user gets
    // feedback even if parsing is slow.
    const resume = await Resume.create({
      user:         req.user._id,
      originalName: req.file.originalname,
      filePath:     req.file.path,
      fileType,
      rawText:      '',
      sections:     [],
      parseStatus:  'pending',
    });

    // ── Parse the file ───────────────────────────────────────────────────────
    let rawText = '';
    let sections = [];

    try {
      rawText  = await extractText(req.file.path, fileType);
      sections = detectSections(rawText);

      await Resume.findByIdAndUpdate(resume._id, {
        rawText,
        sections,
        parseStatus: rawText.trim().length > 0 ? 'success' : 'failed',
      });
    } catch (parseErr) {
      // Parsing failed — mark the record so the frontend can notify the user
      await Resume.findByIdAndUpdate(resume._id, { parseStatus: 'failed' });
      console.error('Resume parse error:', parseErr.message);
    }

    const updated = await Resume.findById(resume._id);

    res.status(201).json({
      success: true,
      resume: {
        id:           updated._id,
        originalName: updated.originalName,
        fileType:     updated.fileType,
        parseStatus:  updated.parseStatus,
        sections:     updated.sections.map((s) => s.label), // labels only for preview
        charCount:    updated.rawText.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/resume
 * Returns all resumes uploaded by the authenticated user (most recent first).
 */
const getMyResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-rawText'); // rawText can be large; omit from list view

    res.json({ success: true, resumes });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/resume/:id
 * Returns a single resume including rawText and sections.
 * Only the owning user can fetch it.
 */
const getResumeById = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) {
      const err = new Error('Resume not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, resume });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/resume/:id
 * Removes the DB record (file on disk is kept for audit; in production you'd
 * also delete the file or move it to cold storage).
 */
const deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!resume) {
      const err = new Error('Resume not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, message: 'Resume deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadMiddleware, uploadResume, getMyResumes, getResumeById, deleteResume };
