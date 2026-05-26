const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect — requires a valid JWT in the token cookie.
 * Attaches req.user on success.
 */
const protect = async (req, res, next) => {
  // Support both cookie and Bearer token for flexibility during transition
  let token;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(401).json({ message: 'User belonging to this token no longer exists' });
  }

  req.user = user;
  next();
};

/**
 * requireAdmin — attach after protect.
 * Restricts route to admin-role users only.
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { protect, requireAdmin };
