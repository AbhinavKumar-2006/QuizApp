const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../validators');
const {
  register,
  login,
  logout,
  getMe,
  updateMe,
  changePassword,
} = require('../controllers/authController');

// Public
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);

// Protected
router.use(protect);
router.get('/me', getMe);
router.patch('/me', updateMe);
router.patch('/me/password', changePassword);

module.exports = router;
