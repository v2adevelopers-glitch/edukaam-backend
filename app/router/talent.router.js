const express = require('express');
const talentCtrl = require('../controller/talent.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validateParams, validateQuery } = require('../middlewares/validation.middleware');
const { talentSchemas } = require('../utils/validation.schemas');
const { ROLE_CODES } = require('../constants/role.constant');
const router = express.Router();

const { protect, restrictTo } = authMiddleware;
const provider = restrictTo(ROLE_CODES.JOB_PROVIDER);

// =====================
// CANDIDATE SEARCH ROUTES
// =====================

router.route("/candidates")
    .get(protect, provider, validateQuery(talentSchemas.getCandidates), talentCtrl.getAllCandidates);

router.route("/candidates/:usercode")
    .get(protect, provider, validateParams(talentSchemas.usercode), talentCtrl.getSingleCandidate);

router.route("/candidates/:usercode/resume")
    .get(protect, provider, validateParams(talentSchemas.usercode), talentCtrl.downloadCandidateResume);

module.exports = router;
