const { QueryTypes } = require('sequelize');
const db = require('../model');
const userService = require('./user.service');
const profileService = require('./profile.service');
const { getRoleKey, ROLE_CODES } = require('../constants/role.constant');
const { MAX_FAILED_LOGINS } = require('../constants/account.constant');
const { APPLICATION_STATUSES } = require('../constants/job.constant');

const select = (sql, replacements = {}) => db.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

const userIncludes = [
    { model: db.role, as: 'role', attributes: ['code', 'role_type'] },
    { model: db.providerProfile, as: 'providerProfile', attributes: ['institution_name', 'verified_at'], required: false }
];

const formatAdminUser = (u) => ({
    ...userService.formatUserInfo(u),
    role_key: getRoleKey(u.role_code),
    failed_login_attempts: u.failed_login_attempts,
    locked: u.failed_login_attempts >= MAX_FAILED_LOGINS,
    institution_name: u.providerProfile ? u.providerProfile.institution_name : null,
    institution_verified: u.role_code === ROLE_CODES.JOB_PROVIDER ? !!(u.providerProfile && u.providerProfile.verified_at) : null
});

// ─── Users ────────────────────────────────────────────────────────────────

exports.getUsers = async (whereCondition = { deleted: false }, page = 1, limit = 10) => {
    try {
        const offset = (page - 1) * limit;
        const { count, rows } = await db.user.findAndCountAll({
            where: whereCondition,
            include: userIncludes,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC'], ['id', 'DESC']],
            distinct: true
        });
        return {
            data: rows.map(formatAdminUser),
            pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
        };
    } catch (err) {
        throw err;
    }
};

exports.getUserByCode = async (code) => {
    try {
        const user = await db.user.findOne({ where: { code, deleted: false }, include: userIncludes });
        return user ? formatAdminUser(user) : null;
    } catch (err) {
        throw err;
    }
};

// User, profile and activity counts
exports.getUserDetail = async (code) => {
    try {
        const user = await db.user.findOne({ where: { code, deleted: false }, include: userIncludes });
        if (!user) return null;

        const [profile_res, [activity]] = await Promise.all([
            profileService.getProfileForRole(user.role_code, code),
            select(`SELECT
                        (SELECT COUNT(*) FROM jobs WHERE provider_user_code = :code AND deleted = false) AS jobs_posted,
                        (SELECT COUNT(*) FROM jobs WHERE provider_user_code = :code AND deleted = false AND job_status = 'open') AS open_jobs,
                        (SELECT COUNT(*) FROM applications WHERE seeker_user_code = :code AND deleted = false) AS applications_made`,
            { code })
        ]);

        return {
            user_info: formatAdminUser(user),
            profile_res,
            activity: {
                jobs_posted: Number(activity.jobs_posted),
                open_jobs: Number(activity.open_jobs),
                applications_made: Number(activity.applications_made)
            }
        };
    } catch (err) {
        throw err;
    }
};

// ─── Stats ────────────────────────────────────────────────────────────────

exports.getStats = async () => {
    try {
        const [[users], [jobs], applicationRows, [recentApplications]] = await Promise.all([
            select(`SELECT
                        SUM(role_code = :provider) AS providers,
                        SUM(role_code = :provider AND status = 'active') AS providers_active,
                        SUM(role_code = :seeker) AS seekers,
                        SUM(role_code = :seeker AND status = 'active') AS seekers_active,
                        SUM(failed_login_attempts >= :maxFailed) AS locked,
                        SUM(role_code <> :admin AND created_at >= NOW() - INTERVAL 30 DAY) AS registered_last_30_days,
                        (SELECT COUNT(*) FROM provider_profiles WHERE deleted = false AND verified_at IS NOT NULL) AS verified_providers
                    FROM users WHERE deleted = false`,
            { provider: ROLE_CODES.JOB_PROVIDER, seeker: ROLE_CODES.JOB_SEEKER, admin: ROLE_CODES.ADMIN, maxFailed: MAX_FAILED_LOGINS }),
            select(`SELECT COUNT(*) AS total,
                        SUM(job_status = 'open') AS open,
                        SUM(job_status = 'closed') AS closed,
                        SUM(taken_down_at IS NOT NULL) AS taken_down,
                        SUM(created_at >= NOW() - INTERVAL 30 DAY) AS posted_last_30_days
                    FROM jobs WHERE deleted = false`),
            select(`SELECT application_status, COUNT(*) AS count FROM applications WHERE deleted = false GROUP BY application_status`),
            select(`SELECT COUNT(*) AS count FROM applications WHERE deleted = false AND applied_at >= NOW() - INTERVAL 30 DAY`)
        ]);

        const n = (v) => Number(v || 0);
        const byStatus = new Map(applicationRows.map(r => [r.application_status, n(r.count)]));
        const applications_by_status = APPLICATION_STATUSES.map(status => ({ application_status: status, count: byStatus.get(status) || 0 }));

        return {
            users: {
                job_providers: n(users.providers),
                job_providers_active: n(users.providers_active),
                verified_providers: n(users.verified_providers),
                job_seekers: n(users.seekers),
                job_seekers_active: n(users.seekers_active),
                locked: n(users.locked),
                registered_last_30_days: n(users.registered_last_30_days)
            },
            jobs: {
                total: n(jobs.total),
                open: n(jobs.open),
                closed: n(jobs.closed),
                taken_down: n(jobs.taken_down),
                posted_last_30_days: n(jobs.posted_last_30_days)
            },
            applications: {
                total: applications_by_status.reduce((sum, s) => sum + s.count, 0),
                applied_last_30_days: n(recentApplications.count),
                applications_by_status
            }
        };
    } catch (err) {
        throw err;
    }
};
