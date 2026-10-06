const bcrypt = require('bcrypt');
const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse } = require('../lib/response.handler');
const userService = require('../service/user.service');
const profileService = require('../service/profile.service');
const rbacService = require('../service/rbac.service');
const registrationService = require('../service/registration.service');
const accountService = require('../service/account.service');
const { signToken } = require('../helper/token.helper');
const { MAX_FAILED_LOGINS } = require('../constants/account.constant');
const { assertMasterCodes } = require('../helper/master.helper');
const { getMeta } = require('../helper/common.helper');

// Account flows report rule failures as { error: name }
const ACCOUNT_ERRORS = {
    otp_invalid: [400, "The code is invalid or has expired"],
    otp_attempts_exceeded: [400, "Too many wrong codes; request a new code"],
    otp_cooldown: [429, "Please wait before requesting another code"],
    otp_delivery_failed: [503, "The code could not be sent right now, please try again later"],
    already_verified: [400, "This is already verified"]
};

const throwAccountError = (result) => {
    const [httpCode, message] = ACCOUNT_ERRORS[result.error] || [400, result.error];
    const text = result.wait ? `Please wait ${result.wait} seconds before requesting another code` : message;
    throw new CustomError(result.error, httpCode, text);
};

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

        const token = signToken(user);
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

// ─── Password & sessions ──────────────────────────────────────────────────

const changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        const user = await userService.getUserByCode(req.user.code);
        if (!user || !user.password || !await bcrypt.compare(current_password, user.password)) {
            throw new CustomError('invalid_current_password', 400, "The current password is wrong");
        }
        if (await bcrypt.compare(new_password, user.password)) {
            throw new CustomError('password_unchanged', 400, "The new password must be different from the current one");
        }

        // every other session ends; this one continues with the new token
        const result = await accountService.changePassword(req.user.code, new_password, getMeta(req));
        successResponse(res, "Password changed successfully", { token: signToken(result.data) });
    } catch (err) {
        errorResponse(res, 'changePassword', err);
    }
};

// Ends every session of the user, on all devices
const logoutUser = async (req, res) => {
    try {
        await accountService.logout(req.user.code, getMeta(req));
        successResponse(res, "Logged out successfully");
    } catch (err) {
        errorResponse(res, 'logoutUser', err);
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { username } = req.body;
        const channel = username.includes('@') ? 'email' : 'phone';

        await accountService.requestPasswordReset(username, channel, getMeta(req));
        // the same answer whether or not the account exists
        successResponse(res, "If an account exists for this username, a reset code has been sent to it", { channel });
    } catch (err) {
        errorResponse(res, 'forgotPassword', err);
    }
};

const resetPassword = async (req, res) => {
    try {
        const { username, otp, new_password } = req.body;

        const result = await accountService.resetPassword(username, otp, new_password, getMeta(req));
        if (result.error) throwAccountError(result);

        successResponse(res, "Password reset successfully, please log in");
    } catch (err) {
        errorResponse(res, 'resetPassword', err);
    }
};

// ─── Verification ─────────────────────────────────────────────────────────

const sendVerification = async (req, res) => {
    try {
        const user = await userService.getUserByCode(req.user.code);
        const result = await accountService.sendVerification(user, req.body.channel, getMeta(req));
        if (result.error) throwAccountError(result);

        successResponse(res, "Verification code sent", { channel: req.body.channel, destination: result.data.destination });
    } catch (err) {
        errorResponse(res, 'sendVerification', err);
    }
};

const confirmVerification = async (req, res) => {
    try {
        const user = await userService.getUserByCode(req.user.code);
        const result = await accountService.confirmVerification(user, req.body.channel, req.body.otp, getMeta(req));
        if (result.error) throwAccountError(result);

        successResponse(res, `${req.body.channel === 'email' ? 'Email' : 'Phone'} verified successfully`, {
            user_info: userService.formatUserInfo(result.data)
        });
    } catch (err) {
        errorResponse(res, 'confirmVerification', err);
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
    // Password & sessions
    changePassword,
    logoutUser,
    forgotPassword,
    resetPassword,
    // Verification
    sendVerification,
    confirmVerification,
    // Account administration
    unlockUser
};
