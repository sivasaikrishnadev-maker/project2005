const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Store bcrypt hash only — never the plain password
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // excluded from query results by default
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
