const mongoose = require('mongoose');

// Each detected section in the resume (e.g. Skills, Experience, Projects)
const sectionSchema = new mongoose.Schema(
  {
    label: String,   // e.g. "skills", "experience", "projects", "education"
    content: String, // raw text of that section
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalName: { type: String, required: true }, // original filename
    filePath: { type: String, required: true },      // path on disk (Multer)
    fileType: {
      type: String,
      enum: ['pdf', 'doc', 'docx', 'txt'],
      required: true,
    },
    rawText: { type: String, default: '' },      // full extracted text
    sections: [sectionSchema],                  // parsed sections
    parseStatus: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', resumeSchema);
