const express = require('express');
const healthCtrl = require('../controller/health.controller');
const router = express.Router();

// =====================
// HEALTH ROUTES
// =====================

// Public: monitors call it without a token
router.route("/")
    .get(healthCtrl.getHealth);

module.exports = router;
