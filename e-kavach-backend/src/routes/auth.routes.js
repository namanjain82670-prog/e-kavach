const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', authLimiter, (req, res, next) => authController.register(req, res, next));
router.post('/login', authLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/otp/request', otpLimiter, (req, res, next) => authController.requestOTP(req, res, next));
router.post('/otp/verify', authLimiter, (req, res, next) => authController.verifyOTP(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

module.exports = router;
