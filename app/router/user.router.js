const express = require('express');
const userCtrl = require('../controller/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { loginLimiter, registerLimiter } = require('../middlewares/rate_limit.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { userSchemas } = require('../utils/validation.schemas');
const router = express.Router();

// =====================
// AUTH ROUTES
// =====================

// Public: no token yet
router.route("/login")
    .post(loginLimiter, validateBody(userSchemas.login), userCtrl.loginUser);

// Public: self-registration for job providers and job seekers
router.route("/register")
    .post(registerLimiter, validateBody(userSchemas.register), userCtrl.registerUser);

router.route("/me")
    .get(authMiddleware.protect, userCtrl.getMe);

module.exports = router;
