const User = require('../models/User');
const { sendTokenResponse } = require('../utils/jwt');

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 */
const register = async (req, res) => {
  const { name, email, password } = req.body;

  const user = await User.create({ name, email, passwordHash: password });
  sendTokenResponse(user, 201, res);
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  sendTokenResponse(user, 200, res);
};

/**
 * POST /api/auth/logout
 * Clears the auth cookie
 */
const logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // Expire in 10 seconds
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

/**
 * GET /api/auth/me
 * Returns the logged-in user's profile.
 */
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

/**
 * PATCH /api/auth/me
 * Body: { name }  — only name is updatable here; password change is separate
 */
const updateMe = async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'name is required' });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name: name.trim() },
    { new: true, runValidators: true }
  );
  res.json({ success: true, user });
};

/**
 * PATCH /api/auth/me/password
 * Body: { currentPassword, newPassword }
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'newPassword must be at least 6 characters' });
  }

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  }

  user.passwordHash = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
};

module.exports = { register, login, logout, getMe, updateMe, changePassword };
