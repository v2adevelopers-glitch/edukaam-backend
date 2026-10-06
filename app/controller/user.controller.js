const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse } = require('../lib/response.handler');
const userService = require('../service/user.service');
const profileService = require('../service/profile.service');
const rbacService = require('../service/rbac.service');
const registrationService = require('../service/registration.service');
const { assertMasterCodes } = require('../helper/master.helper');
const { getMeta } = require('../helper/common.helper');

const TOKEN_TTL_SECONDS = 86400;
const MAX_FAILED_LOGINS = 5;

// ─── Auth ─────────────────────────────────────────────────────────────────

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await userService.getUserInfoByUsername(username);
        // one message for unknown user and wrong password, so accounts can't be probed
        if (!user) {
            throw new CustomError('auth_error', 400, "Invalid credentials");
        }

        if (user.failed_login_attempts >= MAX_FAILED_LOGINS) {
            throw new CustomError('auth_error', 400, "Account locked due to multiple failed login attempts, please contact admin");
        }

        if (!user.password || !await bcrypt.compare(password, user.password)) {
            await userService.incrementFailedLoginAttempts(user.id);
            throw new CustomError('auth_error', 400, "Invalid credentials");
        }

        if (user.status !== 'active') {
            throw new CustomError('auth_error', 400, "User is not active, please contact admin");
        }

        const token = jwt.sign({ id: user.id, role_code: user.role_code }, process.env.JWT_SECRET_KEY, { expiresIn: TOKEN_TTL_SECONDS });
        await userService.recordSuccessfulLogin(user.id);

        const profile_res = await profileService.getProfileForRole(user.role_code, user.code);

        successResponse(res, "User logged in successfully", {
            token,
            user_info: userService.formatUserInfo(user),
            profile_res,
            role_info: userService.formatRoleInfo(user)
        });
    } catch (err) {
        errorResponse(res, 'loginUser', err);
    }
};

const registerUser = async (req, res) => {
    try {
        const { role_key, name, phone, email, password, job_category_code, institution_type_code } = req.body;

        // across all rows, deleted ones included: the unique index covers them too
        if (await userService.emailExists(email)) {
            throw new CustomError('email_exists', 400, "An account with this email already exists");
        }
        if (await userService.phoneExists(phone)) {
            throw new CustomError('phone_exists', 400, "An account with this phone number already exists");
        }

        await assertMasterCodes({ job_category_code, institution_type_code });

        const result = await registrationService.registerUser(
            { role_key, name, phone, email, password, job_category_code, institution_type_code },
            getMeta(req)
        );
        if (result.error) {
            throw new CustomError(result.error, 400, "An account with this email or phone number already exists");
        }

        successResponse(res, "Registration successful, please log in", result.data, 201);
    } catch (err) {
        errorResponse(res, 'registerUser', err);
    }
};

// Everything the frontend needs to restore a session in one call
const getMe = async (req, res) => {
    try {
        const [profile_res, menu_access] = await Promise.all([
            profileService.getProfileForRole(req.user.role_code, req.user.code),
            rbacService.getMenuAccess(req.user.role_code)
        ]);

        successResponse(res, "User info fetched", {
            user_info: userService.formatUserInfo(req.user),
            profile_res,
            role_info: userService.formatRoleInfo(req.user),
            menu_access
        });
    } catch (err) {
        errorResponse(res, 'getMe', err);
    }
};

// ─── Account administration ───────────────────────────────────────────────

const unlockUser = async (req, res) => {
    try {
        const user = await userService.getUserByUsernameOrCode(req.body.username);
        if (!user) {
            throw new CustomError('user_not_found', 404, "User not found");
        }

        const was_locked = user.failed_login_attempts >= MAX_FAILED_LOGINS;
        await userService.clearFailedLoginAttempts(user.code, getMeta(req));

        successResponse(res, was_locked ? "Account unlocked successfully" : "Account was not locked; failed login count cleared", {
            user_info: userService.formatUserInfo(user),
            role_info: userService.formatRoleInfo(user),
            was_locked
        });
    } catch (err) {
        errorResponse(res, 'unlockUser', err);
    }
};

module.exports = {
    // Auth
    loginUser,
    registerUser,
    getMe,
    // Account administration
    unlockUser
};
