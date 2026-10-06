const express = require('express');
const userCtrl = require('../controller/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { loginLimiter, registerLimiter, otpLimiter } = require('../middlewares/rate_limit.middleware');
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
    .get(authMiddleware.protect, userCtrl.getMe)
    // providers and seekers only: the admin account isn't self-service
    .delete(authMiddleware.protect, authMiddleware.restrictTo(ROLE_CODES.JOB_PROVIDER, ROLE_CODES.JOB_SEEKER), authMiddleware.checkApiModuleAccess, validateBody(userSchemas.deleteAccount), userCtrl.deleteMyAccount);

router.route("/me/export")
    .get(authMiddleware.protect, userCtrl.exportMyAccount);

// =====================
// PASSWORD & SESSION ROUTES
// =====================

router.route("/password")
    .patch(authMiddleware.protect, authMiddleware.checkApiModuleAccess, validateBody(userSchemas.changePassword), userCtrl.changePassword);

router.route("/logout")
    .post(authMiddleware.protect, authMiddleware.checkApiModuleAccess, userCtrl.logoutUser);

// Public: the user can't log in
router.route("/forgot-password")
    .post(otpLimiter, validateBody(userSchemas.forgotPassword), userCtrl.forgotPassword);

router.route("/reset-password")
    .post(otpLimiter, validateBody(userSchemas.resetPassword), userCtrl.resetPassword);

// =====================
// VERIFICATION ROUTES
// =====================

router.route("/verify/send")
    .post(authMiddleware.protect, otpLimiter, authMiddleware.checkApiModuleAccess, validateBody(userSchemas.sendVerification), userCtrl.sendVerification);

router.route("/verify/confirm")
    .post(authMiddleware.protect, authMiddleware.checkApiModuleAccess, validateBody(userSchemas.confirmVerification), userCtrl.confirmVerification);

// =====================
// ACCOUNT ADMINISTRATION ROUTES
// =====================

// Admin: clear the lockout after 5 failed logins
router.route("/unlock")
    .patch(authMiddleware.protect, authMiddleware.restrictTo(ROLE_CODES.ADMIN), authMiddleware.checkApiModuleAccess, validateBody(userSchemas.unlockUser), userCtrl.unlockUser);

module.exports = router;
