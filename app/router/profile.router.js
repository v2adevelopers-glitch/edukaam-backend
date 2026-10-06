const express = require('express');
const profileCtrl = require('../controller/profile.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { profileSchemas } = require('../utils/validation.schemas');
const { ROLE_CODES } = require('../constants/role.constant');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { UPLOADS } = require('../constants/file.constant');
const router = express.Router();

const { protect, restrictTo, checkApiModuleAccess } = authMiddleware;

// =====================
// PROVIDER PROFILE ROUTES
// =====================

router.route("/provider/me")
    .get(protect, restrictTo(ROLE_CODES.JOB_PROVIDER), profileCtrl.getProviderProfile)
    .patch(protect, restrictTo(ROLE_CODES.JOB_PROVIDER), checkApiModuleAccess, validateBody(profileSchemas.updateProviderProfile), profileCtrl.updateProviderProfile);

// multipart/form-data, field "file"
router.route("/provider/me/logo")
    .put(protect, restrictTo(ROLE_CODES.JOB_PROVIDER), checkApiModuleAccess, uploadSingle(UPLOADS.LOGO), profileCtrl.uploadLogo)
    .delete(protect, restrictTo(ROLE_CODES.JOB_PROVIDER), checkApiModuleAccess, profileCtrl.deleteLogo);

// =====================
// SEEKER PROFILE ROUTES
// =====================

router.route("/seeker/me")
    .get(protect, restrictTo(ROLE_CODES.JOB_SEEKER), profileCtrl.getSeekerProfile)
    .patch(protect, restrictTo(ROLE_CODES.JOB_SEEKER), checkApiModuleAccess, validateBody(profileSchemas.updateSeekerProfile), profileCtrl.updateSeekerProfile);

// multipart/form-data, field "file"
router.route("/seeker/me/resume")
    .get(protect, restrictTo(ROLE_CODES.JOB_SEEKER), profileCtrl.downloadResume)
    .put(protect, restrictTo(ROLE_CODES.JOB_SEEKER), checkApiModuleAccess, uploadSingle(UPLOADS.RESUME), profileCtrl.uploadResume)
    .delete(protect, restrictTo(ROLE_CODES.JOB_SEEKER), checkApiModuleAccess, profileCtrl.deleteResume);

module.exports = router;
