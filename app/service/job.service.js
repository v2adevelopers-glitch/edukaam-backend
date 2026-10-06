const { Op, fn, literal, QueryTypes } = require('sequelize');
const db = require('../model');
const codeGenerator = require('../helper/code_generator.helper');
const { emptyToNull } = require('../helper/common.helper');
const { toDateOnly } = require('../helper/query.helper');
const { JOB_STATUS } = require('../constants/job.constant');
const { LOGO_URL_PREFIX } = require('../constants/file.constant');

const nameOnly = ['code', 'name'];

const jobMasterIncludes = [
    { model: db.jobCategory, as: 'jobCategory', attributes: nameOnly },
    { model: db.state, as: 'state', attributes: nameOnly },
    { model: db.city, as: 'city', attributes: nameOnly }
];

// Openings show the institution, never the provider's phone or email
const institutionInclude = {
    model: db.user,
    as: 'provider',
    attributes: ['code'],
    required: true,
    where: { status: 'active', deleted: false },
    include: [{
        model: db.providerProfile,
        as: 'providerProfile',
        attributes: ['institution_name', 'institution_type_code', 'website', 'about', 'logo_file', 'verified_at'],
        required: true,
        include: [{ model: db.institutionType, as: 'institutionType', attributes: nameOnly }]
    }]
};

const JOB_COLUMNS = [
    'code', 'provider_user_code', 'job_category_code', 'title', 'job_type', 'vacancies', 'hired_count',
    'min_qualification', 'min_experience_years', 'salary_min', 'salary_max', 'state_code', 'city_code',
    'last_date', 'description', 'job_status', 'taken_down_at', 'takedown_reason', 'created_at', 'modified_at'
];

// `job` is the alias Sequelize gives the jobs table in these queries
const applicantsCountAttr = [
    literal('(SELECT COUNT(*) FROM applications AS a WHERE a.job_code = `job`.`code` AND a.deleted = false)'),
    'applicants_count'
];
const isExpiredAttr = [literal('(`job`.`last_date` < CURDATE())'), 'is_expired'];

const alreadyAppliedAttr = (seekerUserCode) => [
    literal('EXISTS(SELECT 1 FROM applications AS a WHERE a.job_code = `job`.`code` AND a.deleted = false'
        + ` AND a.seeker_user_code = ${db.sequelize.escape(seekerUserCode)})`),
    'already_applied'
];

const isSavedAttr = (seekerUserCode) => [
    literal('EXISTS(SELECT 1 FROM saved_jobs AS s WHERE s.job_code = `job`.`code` AND s.deleted = false'
        + ` AND s.seeker_user_code = ${db.sequelize.escape(seekerUserCode)})`),
    'is_saved'
];

const savedAtAttr = (seekerUserCode) => [
    literal('(SELECT s.modified_at FROM saved_jobs AS s WHERE s.job_code = `job`.`code` AND s.deleted = false'
        + ` AND s.seeker_user_code = ${db.sequelize.escape(seekerUserCode)})`),
    'saved_at'
];

const toBool = (value) => !!Number(value);

const paginate = (count, rows, page, limit) => ({
    data: rows,
    pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
    }
});

// ─── Response shapes ──────────────────────────────────────────────────────

const formatProviderJob = (row) => {
    if (!row) return null;
    return {
        code: row.code,
        title: row.title,
        job_type: row.job_type,
        job_category_code: row.job_category_code,
        job_category_name: row.jobCategory ? row.jobCategory.name : null,
        vacancies: row.vacancies,
        hired_count: row.hired_count,
        applicants_count: Number(row.get('applicants_count')),
        min_qualification: row.min_qualification,
        min_experience_years: row.min_experience_years,
        salary_min: row.salary_min,
        salary_max: row.salary_max,
        state_code: row.state_code,
        state_name: row.state ? row.state.name : null,
        city_code: row.city_code,
        city_name: row.city ? row.city.name : null,
        last_date: row.last_date,
        description: row.description,
        job_status: row.job_status,
        is_expired: toBool(row.get('is_expired')),
        // set by the admin; a taken-down job is closed and can't be reopened
        taken_down: !!row.taken_down_at,
        takedown_reason: row.takedown_reason,
        created_at: row.created_at,
        modified_at: row.modified_at
    };
};

const formatOpening = (row) => {
    if (!row) return null;
    const profile = row.provider && row.provider.providerProfile;
    return {
        code: row.code,
        title: row.title,
        job_type: row.job_type,
        job_category_code: row.job_category_code,
        job_category_name: row.jobCategory ? row.jobCategory.name : null,
        institution_name: profile ? profile.institution_name : null,
        institution_type_code: profile ? profile.institution_type_code : null,
        institution_type_name: profile && profile.institutionType ? profile.institutionType.name : null,
        institution_logo_url: profile && profile.logo_file ? LOGO_URL_PREFIX + profile.logo_file : null,
        institution_verified: !!(profile && profile.verified_at),
        state_code: row.state_code,
        state_name: row.state ? row.state.name : null,
        city_code: row.city_code,
        city_name: row.city ? row.city.name : null,
        salary_min: row.salary_min,
        salary_max: row.salary_max,
        vacancies: row.vacancies,
        min_qualification: row.min_qualification,
        min_experience_years: row.min_experience_years,
        last_date: row.last_date,
        description: row.description,
        job_status: row.job_status,
        is_expired: toBool(row.get('is_expired')),
        posted_at: row.created_at,
        // seeker-specific flags; absent on the public list
        ...(row.get('already_applied') !== undefined ? {
            already_applied: toBool(row.get('already_applied')),
            is_saved: toBool(row.get('is_saved'))
        } : {}),
        ...(row.get('saved_at') !== undefined ? { saved_at: row.get('saved_at') } : {})
    };
};

// ─── Common ───────────────────────────────────────────────────────────────

// Today as the DB sees it ('YYYY-MM-DD'), so the check matches CURDATE() in queries
exports.getDbToday = async (transaction = null) => {
    try {
        const rows = await db.sequelize.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today", {
            type: QueryTypes.SELECT,
            transaction
        });
        return rows[0].today;
    } catch (err) {
        throw err;
    }
};

// ─── Provider jobs ────────────────────────────────────────────────────────

const providerJobOptions = {
    attributes: [...JOB_COLUMNS, applicantsCountAttr, isExpiredAttr],
    include: jobMasterIncludes
};

exports.getProviderJobs = async (whereCondition = { deleted: false }, page = 1, limit = 10) => {
    try {
        const offset = (page - 1) * limit;
        const { count, rows } = await db.job.findAndCountAll({
            ...providerJobOptions,
            where: whereCondition,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC'], ['id', 'DESC']],
            distinct: true
        });
        return paginate(count, rows.map(formatProviderJob), page, limit);
    } catch (err) {
        throw err;
    }
};

exports.getProviderJob = async (whereCondition) => {
    try {
        return formatProviderJob(await db.job.findOne({ ...providerJobOptions, where: whereCondition }));
    } catch (err) {
        throw err;
    }
};

exports.createJob = async (payload, provider_user_code, meta = {}) => {
    const t = await db.sequelize.transaction();
    try {
        const code = await codeGenerator.generateJobCode(t);
        await db.job.create({
            code,
            provider_user_code,
            job_category_code: payload.job_category_code,
            title: payload.title,
            job_type: payload.job_type,
            vacancies: payload.vacancies,
            hired_count: 0,
            min_qualification: emptyToNull(payload.min_qualification) || null,
            min_experience_years: payload.min_experience_years || 0,
            salary_min: payload.salary_min,
            salary_max: payload.salary_max,
            state_code: payload.state_code,
            city_code: payload.city_code,
            last_date: toDateOnly(payload.last_date),
            description: emptyToNull(payload.description) || null,
            job_status: JOB_STATUS.OPEN,
            status: 'active',
            deleted: false,
            created_at: new Date(),
            created_by: meta.userId || null,
            modified_at: new Date(),
            modified_by: null,
            ip_address: meta.ip || null
        }, { transaction: t });
        await t.commit();
        return await exports.getProviderJob({ code, deleted: false });
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

// Rules that depend on hired_count run under a lock on the job row, so a concurrent hire
// can't slip between the check and the write. Returns { error } or { data }.
exports.updateJob = async (code, provider_user_code, payload, meta = {}) => {
    const t = await db.sequelize.transaction();
    try {
        const job = await db.job.findOne({
            where: { code, provider_user_code, deleted: false },
            lock: t.LOCK.UPDATE,
            transaction: t
        });
        if (!job) {
            await t.rollback();
            return { error: 'job_not_found' };
        }

        // applications were made for the old category; moving them would break category matching
        if (payload.job_category_code && payload.job_category_code !== job.job_category_code) {
            const liveApplications = await db.application.count({ where: { job_code: code, deleted: false }, transaction: t });
            if (liveApplications > 0) {
                await t.rollback();
                return { error: 'job_category_locked' };
            }
        }

        const vacancies = payload.vacancies !== undefined ? payload.vacancies : job.vacancies;
        if (vacancies < job.hired_count) {
            await t.rollback();
            return { error: 'vacancies_below_hired' };
        }
        const filled = job.hired_count >= vacancies;

        let job_status = payload.job_status !== undefined ? payload.job_status : job.job_status;
        if (payload.job_status === JOB_STATUS.OPEN && job.job_status !== JOB_STATUS.OPEN) {
            if (job.taken_down_at) {
                await t.rollback();
                return { error: 'job_taken_down' };
            }
            if (filled) {
                await t.rollback();
                return { error: 'job_vacancies_filled' };
            }
            const lastDate = payload.last_date !== undefined ? toDateOnly(payload.last_date) : job.last_date;
            if (lastDate < await exports.getDbToday(t)) {
                await t.rollback();
                return { error: 'job_expired' };
            }
        }
        // a job with every vacancy filled is always closed
        if (filled) job_status = JOB_STATUS.CLOSED;

        await db.job.update({
            job_category_code: payload.job_category_code,
            title: payload.title,
            job_type: payload.job_type,
            vacancies: payload.vacancies,
            min_qualification: emptyToNull(payload.min_qualification),
            min_experience_years: payload.min_experience_years,
            salary_min: payload.salary_min,
            salary_max: payload.salary_max,
            state_code: payload.state_code,
            city_code: payload.city_code,
            last_date: payload.last_date !== undefined ? toDateOnly(payload.last_date) : undefined,
            description: emptyToNull(payload.description),
            job_status,
            modified_at: new Date(),
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { id: job.id }, transaction: t });

        await t.commit();
        return { data: await exports.getProviderJob({ code, deleted: false }) };
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

// Apply locks the job row too, so no application can be added between the count and the delete
exports.deleteJob = async (code, provider_user_code, meta = {}) => {
    const t = await db.sequelize.transaction();
    try {
        const job = await db.job.findOne({
            where: { code, provider_user_code, deleted: false },
            lock: t.LOCK.UPDATE,
            transaction: t
        });
        if (!job) {
            await t.rollback();
            return { error: 'job_not_found' };
        }

        const liveApplications = await db.application.count({ where: { job_code: code, deleted: false }, transaction: t });
        if (liveApplications > 0) {
            await t.rollback();
            return { error: 'job_in_use' };
        }

        await db.job.update({
            deleted: true,
            status: 'inactive',
            modified_at: new Date(),
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { id: job.id }, transaction: t });

        await t.commit();
        return { data: true };
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

// ─── Hiring hooks (used by the application service inside its transaction) ───

exports.getJobForUpdate = async (whereCondition, transaction) => {
    try {
        return await db.job.findOne({ where: whereCondition, lock: transaction.LOCK.UPDATE, transaction });
    } catch (err) {
        throw err;
    }
};

exports.isJobExpired = async (jobId, transaction = null) => {
    try {
        const expired = await db.job.count({
            where: { id: jobId, last_date: { [Op.lt]: fn('CURDATE') } },
            transaction
        });
        return expired > 0;
    } catch (err) {
        throw err;
    }
};

exports.updateJobHiring = async (jobId, { hired_count, job_status }, meta = {}, transaction = null) => {
    try {
        await db.job.update({
            hired_count,
            job_status,
            modified_at: new Date(),
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { id: jobId }, transaction });
    } catch (err) {
        throw err;
    }
};

// ─── Seeker openings ──────────────────────────────────────────────────────

// seekerUserCode null = public listing (no seeker flags)
const openingOptions = (seekerUserCode, extraAttributes = []) => ({
    attributes: [
        ...JOB_COLUMNS,
        isExpiredAttr,
        ...(seekerUserCode ? [alreadyAppliedAttr(seekerUserCode), isSavedAttr(seekerUserCode)] : []),
        ...extraAttributes
    ],
    include: [...jobMasterIncludes, institutionInclude]
});

const listOpenings = async (options, whereCondition, page, limit, order) => {
    const offset = (page - 1) * limit;
    const { count, rows } = await db.job.findAndCountAll({
        ...options,
        where: whereCondition,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        distinct: true
    });
    return paginate(count, rows.map(formatOpening), page, limit);
};

const NEWEST_FIRST = [['created_at', 'DESC'], ['id', 'DESC']];

const withInstitutionDetails = (row) => ({
    ...formatOpening(row),
    institution_website: row.provider.providerProfile.website,
    institution_about: row.provider.providerProfile.about
});

exports.getOpenings = async (whereCondition, seekerUserCode, page = 1, limit = 10) => {
    try {
        return await listOpenings(openingOptions(seekerUserCode), whereCondition, page, limit, NEWEST_FIRST);
    } catch (err) {
        throw err;
    }
};

exports.getOpening = async (whereCondition, seekerUserCode) => {
    try {
        const row = await db.job.findOne({ ...openingOptions(seekerUserCode), where: whereCondition });
        if (!row) return null;

        const myApplication = await db.application.findOne({
            where: { job_code: row.code, seeker_user_code: seekerUserCode, deleted: false },
            attributes: ['code', 'application_status', 'applied_at']
        });

        return {
            ...withInstitutionDetails(row),
            my_application: myApplication ? {
                code: myApplication.code,
                application_status: myApplication.application_status,
                applied_at: myApplication.applied_at
            } : null
        };
    } catch (err) {
        throw err;
    }
};

// ─── Public jobs ──────────────────────────────────────────────────────────

exports.getPublicJobs = async (whereCondition, page = 1, limit = 10) => {
    try {
        return await listOpenings(openingOptions(null), whereCondition, page, limit, NEWEST_FIRST);
    } catch (err) {
        throw err;
    }
};

exports.getPublicJob = async (whereCondition) => {
    try {
        const row = await db.job.findOne({ ...openingOptions(null), where: whereCondition });
        return row ? withInstitutionDetails(row) : null;
    } catch (err) {
        throw err;
    }
};

// ─── Saved jobs ───────────────────────────────────────────────────────────

// The seeker's saved jobs (open or not), most recently saved first
exports.getSavedJobs = async (whereCondition, seekerUserCode, page = 1, limit = 10) => {
    try {
        const savedBySeeker = literal(`(SELECT s.job_code FROM saved_jobs AS s WHERE s.deleted = false
            AND s.seeker_user_code = ${db.sequelize.escape(seekerUserCode)})`);
        return await listOpenings(
            openingOptions(seekerUserCode, [savedAtAttr(seekerUserCode)]),
            { ...whereCondition, code: { [Op.in]: savedBySeeker } },
            page, limit,
            [[literal('saved_at'), 'DESC'], ['id', 'DESC']]
        );
    } catch (err) {
        throw err;
    }
};

// Saving twice is fine; saving after unsaving revives the same row (the pair is unique)
exports.saveJob = async (seeker_user_code, job_code, meta = {}) => {
    try {
        const existing = await db.savedJob.findOne({ where: { seeker_user_code, job_code } });
        const now = new Date();
        if (existing && !existing.deleted) return { created: false };
        if (existing) {
            await existing.update({ deleted: false, status: 'active', modified_at: now, modified_by: meta.userId || null, ip_address: meta.ip || null });
            return { created: true };
        }
        try {
            await db.savedJob.create({
                seeker_user_code,
                job_code,
                status: 'active',
                deleted: false,
                created_at: now,
                created_by: meta.userId || null,
                modified_at: now,
                modified_by: null,
                ip_address: meta.ip || null
            });
        } catch (err) {
            // a concurrent save of the same job won the insert
            if (err.name === 'SequelizeUniqueConstraintError') return { created: false };
            throw err;
        }
        return { created: true };
    } catch (err) {
        throw err;
    }
};

exports.unsaveJob = async (seeker_user_code, job_code, meta = {}) => {
    try {
        const [updated] = await db.savedJob.update({
            deleted: true,
            status: 'inactive',
            modified_at: new Date(),
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { seeker_user_code, job_code, deleted: false } });
        return !!updated;
    } catch (err) {
        throw err;
    }
};

// ─── Admin moderation ─────────────────────────────────────────────────────

const adminJobOptions = {
    attributes: [...JOB_COLUMNS, applicantsCountAttr, isExpiredAttr],
    include: [
        ...jobMasterIncludes,
        {
            model: db.user,
            as: 'provider',
            attributes: ['code', 'deleted'],
            include: [{ model: db.providerProfile, as: 'providerProfile', attributes: ['institution_name'] }]
        }
    ]
};

const formatAdminJob = (row) => ({
    ...formatProviderJob(row),
    provider_user_code: row.provider_user_code,
    institution_name: row.provider && row.provider.providerProfile ? row.provider.providerProfile.institution_name : null,
    taken_down_at: row.taken_down_at
});

exports.getAdminJobs = async (whereCondition = { deleted: false }, page = 1, limit = 10) => {
    try {
        const offset = (page - 1) * limit;
        const { count, rows } = await db.job.findAndCountAll({
            ...adminJobOptions,
            where: whereCondition,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC'], ['id', 'DESC']],
            distinct: true
        });
        return paginate(count, rows.map(formatAdminJob), page, limit);
    } catch (err) {
        throw err;
    }
};

exports.getAdminJob = async (code) => {
    try {
        const row = await db.job.findOne({ ...adminJobOptions, where: { code, deleted: false } });
        return row ? formatAdminJob(row) : null;
    } catch (err) {
        throw err;
    }
};

// Takedown closes the job and blocks reopening; restore lifts the block (the job stays closed
// until its provider reopens it). Returns { error } or { data }.
exports.moderateJob = async (code, action, reason, meta = {}) => {
    const t = await db.sequelize.transaction();
    try {
        const job = await db.job.findOne({ where: { code, deleted: false }, lock: t.LOCK.UPDATE, transaction: t });
        if (!job) {
            await t.rollback();
            return { error: 'job_not_found' };
        }
        const audit = { modified_at: new Date(), modified_by: meta.userId || null, ip_address: meta.ip || null };

        if (action === 'takedown') {
            if (job.taken_down_at) {
                await t.rollback();
                return { error: 'job_already_taken_down' };
            }
            await job.update({ taken_down_at: new Date(), taken_down_by: meta.userId || null, takedown_reason: reason, job_status: JOB_STATUS.CLOSED, ...audit }, { transaction: t });
        } else {
            if (!job.taken_down_at) {
                await t.rollback();
                return { error: 'job_not_taken_down' };
            }
            await job.update({ taken_down_at: null, taken_down_by: null, takedown_reason: null, ...audit }, { transaction: t });
        }

        await t.commit();
        return { data: await exports.getAdminJob(code) };
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

// ─── Account deletion ─────────────────────────────────────────────────────

// A deleted provider's open jobs stop taking applications (rows stay for applicants' history)
exports.closeAllForProvider = async (provider_user_code, meta = {}, transaction = null) => {
    try {
        const [closed] = await db.job.update({
            job_status: JOB_STATUS.CLOSED,
            modified_at: new Date(),
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { provider_user_code, deleted: false, job_status: JOB_STATUS.OPEN }, transaction });
        return closed;
    } catch (err) {
        throw err;
    }
};

exports.unsaveAllForSeeker = async (seeker_user_code, meta = {}, transaction = null) => {
    try {
        await db.savedJob.update({
            deleted: true,
            status: 'inactive',
            modified_at: new Date(),
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { seeker_user_code, deleted: false }, transaction });
    } catch (err) {
        throw err;
    }
};

// ─── Cron ─────────────────────────────────────────────────────────────────

// Open jobs whose last date has passed stop taking applications
exports.closeExpiredJobs = async () => {
    try {
        const [closed] = await db.job.update({
            job_status: JOB_STATUS.CLOSED,
            modified_at: new Date()
        }, {
            where: { job_status: JOB_STATUS.OPEN, deleted: false, last_date: { [Op.lt]: fn('CURDATE') } }
        });
        return { closed };
    } catch (err) {
        throw err;
    }
};
