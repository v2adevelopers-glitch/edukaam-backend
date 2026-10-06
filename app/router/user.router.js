const express = require('express');
const userCtrl = require('../controller/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { loginLimiter, registerLimiter } = require('../middlewares/rate_limit.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { userSchemas } = require('../utils/validation.schemas');
const { ROLE_CODES } = require('../constants/role.constant');
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

// =====================
// ACCOUNT ADMINISTRATION ROUTES
// =====================

// Admin: clear the lockout after 5 failed logins
router.route("/unlock")
    .patch(authMiddleware.protect, authMiddleware.restrictTo(ROLE_CODES.ADMIN), authMiddleware.checkApiModuleAccess, validateBody(userSchemas.unlockUser), userCtrl.unlockUser);

module.exports = router;
