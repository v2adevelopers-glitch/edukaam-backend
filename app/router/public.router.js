const express = require('express');
const publicCtrl = require('../controller/public.controller');
const { validateParams } = require('../middlewares/validation.middleware');
const { publicSchemas } = require('../utils/validation.schemas');
const router = express.Router();

// Everything here is public: no token

// =====================
// LOGO ROUTES
// =====================

router.route("/logos/:filename")
    .get(validateParams(publicSchemas.filename), publicCtrl.getLogo);

module.exports = router;
