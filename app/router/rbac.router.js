const express = require('express');
const rbacCtrl = require('../controller/rbac.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validateParams } = require('../middlewares/validation.middleware');
const { rbacSchemas } = require('../utils/validation.schemas');
const router = express.Router();

// =====================
// MENU ACCESS ROUTES
// =====================

router.route("/menu-access/:rolecode")
    .get(authMiddleware.protect, validateParams(rbacSchemas.rolecode), rbacCtrl.getMenuAccess);

module.exports = router;
