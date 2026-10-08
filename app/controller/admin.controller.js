const { Op } = require('sequelize');
const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse } = require('../lib/response.handler');
const adminService = require('../service/admin.service');
const userService = require('../service/user.service');
const profileService = require('../service/profile.service');
const jobService = require('../service/job.service');
const { getMeta } = require('../helper/common.helper');
const { getRoleCodeByKey, ROLE_CODES } = require('../constants/role.constant');
const { MAX_FAILED_LOGINS } = require('../constants/account.constant');

const JOB_ERRORS = {
    job_not_found: [404, "Job not found"],
    job_already_taken_down: [400, "This job is already taken down"],
    job_not_taken_down: [400, "This job is not taken down"]
};

// ─── Users ────────────────────────────────────────────────────────────────

const getAllUsers = async (req, res) => {
    try {
        const { page, limit, search, role_key, status, locked, verified } = req.query;

        let whereCondition = { deleted: false };

        if (role_key) {
            whereCondition.role_code = getRoleCodeByKey(role_key);
        }
        if (status) {
            whereCondition.status = status;
        }
        if (locked !== undefined) {
            whereCondition.failed_login_attempts = locked ? { [Op.gte]: MAX_FAILED_LOGINS } : { [Op.lt]: MAX_FAILED_LOGINS };
        }
        if (verified !== undefined) {
            // institution verification only applies to providers
            whereCondition.role_code = ROLE_CODES.JOB_PROVIDER;
            whereCondition['$providerProfile.verified_at$'] = verified ? { [Op.ne]: null } : null;
        }
        // an email, phone or user code is matched from its start, which the unique indexes serve;
        // other text is a name search (a contains-match, so it scans users)
        if (search) {
            if (search.includes('@')) {
                whereCondition.email = { [Op.like]: `${search}%` };
            } else if (/^[0-9]+$/.test(search)) {
                whereCondition.phone = { [Op.like]: `${search}%` };
            } else if (/^EDJUSR[0-9]*$/i.test(search)) {
                whereCondition.code = { [Op.like]: `${search.toUpperCase()}%` };
            } else {
                whereCondition[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `${search}%` } }
                ];
            }
        }

        const users = await adminService.getUsers(whereCondition, page, limit);
        successResponse(res, "Users fetched successfully", users);
    } catch (err) {
        errorResponse(res, 'getAllUsers', err);
    }
};

const getSingleUser = async (req, res) => {
    try {
        const user = await adminService.getUserDetail(req.params.usercode);
        if (!user) {
            throw new CustomError('user_not_found', 404, "User not found");
        }
        successResponse(res, "User info fetched", user);
    } catch (err) {
        errorResponse(res, 'getSingleUser', err);
    }
};

// Deactivating ends the user's sessions and blocks login; activating allows it again
const updateUserStatus = async (req, res) => {
    try {
        const { usercode } = req.params;

        if (usercode === req.user.code) {
            throw new CustomError('cannot_change_own_status', 400, "You can't change your own account's status");
        }
        const updated = await userService.setStatus(usercode, req.body.status, getMeta(req));
        if (!updated) {
            throw new CustomError('user_not_found', 404, "User not found");
        }

        const user = await adminService.getUserByCode(usercode);
        successResponse(res, req.body.status === 'inactive' ? "User deactivated" : "User activated", { user_info: user });
    } catch (err) {
        errorResponse(res, 'updateUserStatus', err);
    }
};

const updateProviderVerification = async (req, res) => {
    try {
        const { usercode } = req.params;

        const user = await adminService.getUserByCode(usercode);
        if (!user) {
            throw new CustomError('user_not_found', 404, "User not found");
        }
        if (user.role_code !== ROLE_CODES.JOB_PROVIDER) {
            throw new CustomError('not_a_provider', 400, "Only job providers can be verified");
        }

        await profileService.setProviderVerified(usercode, req.body.is_verified, getMeta(req));
        const updated = await adminService.getUserByCode(usercode);
        successResponse(res, req.body.is_verified ? "Institution verified" : "Institution verification removed", { user_info: updated });
    } catch (err) {
        errorResponse(res, 'updateProviderVerification', err);
    }
};

// ─── Jobs ─────────────────────────────────────────────────────────────────

const getAllJobs = async (req, res) => {
    try {
        const { page, limit, search, provider_user_code, job_category_code, job_status, taken_down } = req.query;

        let whereCondition = { deleted: false };

        if (provider_user_code) {
            whereCondition.provider_user_code = provider_user_code;
        }
        if (job_category_code) {
            whereCondition.job_category_code = job_category_code;
        }
        if (job_status) {
            whereCondition.job_status = job_status;
        }
        if (taken_down !== undefined) {
            whereCondition.taken_down_at = taken_down ? { [Op.ne]: null } : null;
        }
        if (search) {
            whereCondition[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { '$provider.providerProfile.institution_name$': { [Op.like]: `%${search}%` } }
            ];
        }

        const jobs = await jobService.getAdminJobs(whereCondition, page, limit);
        successResponse(res, "Jobs fetched successfully", jobs);
    } catch (err) {
        errorResponse(res, 'getAllJobs', err);
    }
};

const moderateJob = async (req, res) => {
    try {
        const { action, reason } = req.body;

        const result = await jobService.moderateJob(req.params.jobid, action, reason || null, getMeta(req));
        if (result.error) {
            const [httpCode, message] = JOB_ERRORS[result.error];
            throw new CustomError(result.error, httpCode, message);
        }

        successResponse(res, action === 'takedown' ? "Job taken down" : "Job restored", result.data);
    } catch (err) {
        errorResponse(res, 'moderateJob', err);
    }
};

// ─── Stats ────────────────────────────────────────────────────────────────

const getStats = async (req, res) => {
    try {
        const stats = await adminService.getStats();
        successResponse(res, "Platform stats fetched", stats);
    } catch (err) {
        errorResponse(res, 'getStats', err);
    }
};

module.exports = {
    // Users
    getAllUsers,
    getSingleUser,
    updateUserStatus,
    updateProviderVerification,
    // Jobs
    getAllJobs,
    moderateJob,
    // Stats
    getStats
};
