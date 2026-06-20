const jwt = require('jsonwebtoken');
const User = require('../models/User');

// protect — verifies the Bearer JWT on every secured route
// Attaches the decoded user object to req.user so controllers can use it
const protect = async (req, res, next) => {
  try {
    // Expect: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err = new Error('Not authorised — no token');
      err.statusCode = 401;
      return next(err);
    }

    const token = authHeader.split(' ')[1];

    // jwt.verify throws if token is expired or signature is invalid
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Confirm the user still exists in the DB (handles deleted-account edge case)
    const user = await User.findById(decoded.id);
    if (!user) {
      const err = new Error('User belonging to this token no longer exists');
      err.statusCode = 401;
      return next(err);
    }

    req.user = user; // available in all downstream controllers
    next();
  } catch (err) {
    // jwt.verify throws JsonWebTokenError / TokenExpiredError
    err.statusCode = 401;
    err.message = err.message || 'Invalid or expired token';
    next(err);
  }
};

module.exports = { protect };
