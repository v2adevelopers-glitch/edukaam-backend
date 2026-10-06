const db = require('../model');
const jobService = require('./job.service');
const codeGenerator = require('../helper/code_generator.helper');
const { emptyToNull } = require('../helper/common.helper');
const { APPLICATION_STATUS, JOB_STATUS } = require('../constants/job.constant');
const { LOGO_URL_PREFIX } = require('../constants/file.constant');

const nameOnly = ['code', 'name'];

const paginate = (count, rows, page, limit) => ({
    data: rows,
    pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
    }
});

const APPLICATION_COLUMNS = ['code', 'job_code', 'seeker_user_code', 'application_status', 'applied_at', 'status_changed_at',
    'cover_note', 'provider_notes', 'interview_at', 'interview_mode', 'interview_location', 'interview_notes'];

// Interview details; provider_notes is never part of this (seekers must not see it)
const interviewOf = (row) => ({
    interview_at: row.interview_at,
    interview_mode: row.interview_mode,
    interview_location: row.interview_location,
    interview_notes: row.interview_notes
});

// ─── Provider side ────────────────────────────────────────────────────────
// The only place a seeker's phone and email leave the API: the provider who owns the job.

const providerIncludes = (withFullProfile) => [
    {
        model: db.job,
        as: 'job',
        attributes: ['code', 'title', 'job_category_code', 'job_status', 'vacancies', 'hired_count', 'provider_user_code'],
        required: true,
        include: [{ model: db.jobCategory, as: 'jobCategory', attributes: nameOnly }]
    },
    {
        model: db.user,
        as: 'seeker',
        attributes: ['code', 'name', 'phone', 'email'],
        required: true,
        include: [{
            model: db.seekerProfile,
            as: 'seekerProfile',
            attributes: withFullProfile
                ? ['job_category_code', 'gender', 'date_of_birth', 'qualification', 'experience_years', 'skills',
                    'expected_salary', 'state_code', 'city_code', 'about', 'resume_file', 'resume_name']
                : ['qualification', 'experience_years', 'resume_file'],
            include: withFullProfile ? [
                { model: db.jobCategory, as: 'jobCategory', attributes: nameOnly },
                { model: db.state, as: 'state', attributes: nameOnly },
                { model: db.city, as: 'city', attributes: nameOnly }
            ] : []
        }]
    }
];

const formatProviderApplication = (row) => {
    const profile = row.seeker.seekerProfile;
    return {
        code: row.code,
        job_code: row.job_code,
        job_title: row.job.title,
        job_category_code: row.job.job_category_code,
        job_category_name: row.job.jobCategory ? row.job.jobCategory.name : null,
        applicant_code: row.seeker.code,
        applicant_name: row.seeker.name,
        applicant_phone: row.seeker.phone,
        applicant_email: row.seeker.email,
        experience_years: profile ? profile.experience_years : null,
        qualification: profile ? profile.qualification : null,
        has_resume: !!(profile && profile.resume_file),
        application_status: row.application_status,
        applied_at: row.applied_at,
        status_changed_at: row.status_changed_at,
        interview_at: row.interview_at,
        interview_mode: row.interview_mode
    };
};

const formatProviderApplicationDetail = (row) => {
    const profile = row.seeker.seekerProfile;
    return {
        code: row.code,
        job_code: row.job_code,
        job_title: row.job.title,
        job_status: row.job.job_status,
        vacancies: row.job.vacancies,
        hired_count: row.job.hired_count,
        application_status: row.application_status,
        applied_at: row.applied_at,
        status_changed_at: row.status_changed_at,
        cover_note: row.cover_note,
        provider_notes: row.provider_notes,
        ...interviewOf(row),
        applicant: {
            code: row.seeker.code,
            name: row.seeker.name,
            phone: row.seeker.phone,
            email: row.seeker.email,
            job_category_code: profile ? profile.job_category_code : null,
            job_category_name: profile && profile.jobCategory ? profile.jobCategory.name : null,
            gender: profile ? profile.gender : null,
            date_of_birth: profile ? profile.date_of_birth : null,
            qualification: profile ? profile.qualification : null,
            experience_years: profile ? profile.experience_years : null,
            skills: profile ? profile.skills : null,
            expected_salary: profile ? profile.expected_salary : null,
            state_code: profile ? profile.state_code : null,
            state_name: profile && profile.state ? profile.state.name : null,
            city_code: profile ? profile.city_code : null,
            city_name: profile && profile.city ? profile.city.name : null,
            about: profile ? profile.about : null,
            has_resume: !!(profile && profile.resume_file),
            resume_name: profile ? profile.resume_name : null
        }
    };
};

exports.getProviderApplications = async (whereCondition = { deleted: false }, page = 1, limit = 10) => {
    try {
        const offset = (page - 1) * limit;
        const { count, rows } = await db.application.findAndCountAll({
            where: whereCondition,
            attributes: APPLICATION_COLUMNS,
            include: providerIncludes(false),
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['applied_at', 'DESC'], ['id', 'DESC']],
            distinct: true
        });
        return paginate(count, rows.map(formatProviderApplication), page, limit);
    } catch (err) {
        throw err;
    }
};

exports.getProviderApplication = async (whereCondition) => {
    try {
        const row = await db.application.findOne({
            where: whereCondition,
            attributes: APPLICATION_COLUMNS,
            include: providerIncludes(true)
        });
        return row ? formatProviderApplicationDetail(row) : null;
    } catch (err) {
        throw err;
    }
};

// Lock order is job, then application (the same as apply), so the two can't deadlock.
// hired_count changes and the auto-close happen in the same transaction as the status change.
// Returns { error } or { data }.
// interview = { interview_at, interview_mode, interview_location, interview_notes } when the
// new status is 'interview'. Sending 'interview' again for an interview application reschedules.
exports.updateApplicationStatus = async (code, provider_user_code, application_status, meta = {}, interview = null) => {
    const t = await db.sequelize.transaction();
    const fail = async (error) => {
        await t.rollback();
        return { error };
    };
    try {
        const current = await db.application.findOne({ where: { code, deleted: false }, attributes: ['job_code'], transaction: t });
        if (!current) return await fail('application_not_found');

        // another provider's application is reported as not found
        const job = await jobService.getJobForUpdate({ code: current.job_code, provider_user_code, deleted: false }, t);
        if (!job) return await fail('application_not_found');

        const application = await db.application.findOne({ where: { code, deleted: false }, lock: t.LOCK.UPDATE, transaction: t });
        if (!application) return await fail('application_not_found');

        const previous = application.application_status;
        const now = new Date();
        const interviewColumns = application_status === APPLICATION_STATUS.INTERVIEW && interview ? {
            interview_at: interview.interview_at,
            interview_mode: interview.interview_mode,
            interview_location: emptyToNull(interview.interview_location) || null,
            interview_notes: emptyToNull(interview.interview_notes) || null
        } : {};

        if (previous === application_status) {
            if (application_status !== APPLICATION_STATUS.INTERVIEW || !interview) return await fail('application_status_unchanged');
            await db.application.update({
                ...interviewColumns,
                modified_at: now,
                modified_by: meta.userId || null,
                ip_address: meta.ip || null
            }, { where: { id: application.id }, transaction: t });
            await t.commit();
            return {
                data: {
                    code,
                    job_code: job.code,
                    application_status,
                    previous_status: previous,
                    status_changed_at: application.status_changed_at,
                    ...interviewColumns,
                    rescheduled: true,
                    job_status: job.job_status,
                    vacancies: job.vacancies,
                    hired_count: job.hired_count,
                    job_auto_closed: false
                }
            };
        }

        let hiredCount = job.hired_count;
        let jobStatus = job.job_status;
        let jobAutoClosed = false;

        if (application_status === APPLICATION_STATUS.HIRED) {
            if (hiredCount >= job.vacancies) return await fail('job_vacancies_filled');
            hiredCount += 1;
            if (hiredCount >= job.vacancies && jobStatus === JOB_STATUS.OPEN) {
                jobStatus = JOB_STATUS.CLOSED;
                jobAutoClosed = true;
            }
        } else if (previous === APPLICATION_STATUS.HIRED) {
            // un-hiring frees a vacancy but does not reopen the job; the provider decides that
            hiredCount = Math.max(0, hiredCount - 1);
        }

        if (hiredCount !== job.hired_count || jobStatus !== job.job_status) {
            await jobService.updateJobHiring(job.id, { hired_count: hiredCount, job_status: jobStatus }, meta, t);
        }

        await db.application.update({
            application_status,
            status_changed_at: now,
            ...interviewColumns,
            modified_at: now,
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { id: application.id }, transaction: t });

        await t.commit();
        return {
            data: {
                code,
                job_code: job.code,
                application_status,
                previous_status: previous,
                status_changed_at: now,
                ...interviewColumns,
                rescheduled: false,
                job_status: jobStatus,
                vacancies: job.vacancies,
                hired_count: hiredCount,
                job_auto_closed: jobAutoClosed
            }
        };
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

// Private notes: only the provider who owns the job reads or writes them
exports.updateProviderNotes = async (code, provider_user_code, provider_notes, meta = {}) => {
    try {
        const application = await db.application.findOne({
            where: { code, deleted: false, '$job.provider_user_code$': provider_user_code },
            attributes: ['id'],
            include: [{ model: db.job, as: 'job', attributes: [], required: true }]
        });
        if (!application) return null;

        await db.application.update({
            provider_notes: emptyToNull(provider_notes) || null,
            modified_at: new Date(),
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { id: application.id } });
        return { code, provider_notes: emptyToNull(provider_notes) || null };
    } catch (err) {
        throw err;
    }
};

// Same rows as the provider list, without pagination (capped)
exports.getProviderApplicationsForExport = async (whereCondition, maxRows) => {
    try {
        const rows = await db.application.findAll({
            where: whereCondition,
            attributes: APPLICATION_COLUMNS,
            include: providerIncludes(false),
            limit: maxRows,
            order: [['applied_at', 'DESC'], ['id', 'DESC']]
        });
        return rows.map(formatProviderApplication);
    } catch (err) {
        throw err;
    }
};

// ─── Seeker side ──────────────────────────────────────────────────────────
// Shows the institution, never the provider's phone or email.

const seekerIncludes = [{
    model: db.job,
    as: 'job',
    attributes: ['code', 'title', 'job_type', 'job_status', 'job_category_code', 'vacancies', 'min_qualification',
        'min_experience_years', 'salary_min', 'salary_max', 'state_code', 'city_code', 'last_date', 'description'],
    required: true,
    include: [
        { model: db.jobCategory, as: 'jobCategory', attributes: nameOnly },
        { model: db.state, as: 'state', attributes: nameOnly },
        { model: db.city, as: 'city', attributes: nameOnly },
        {
            model: db.user,
            as: 'provider',
            attributes: ['code'],
            include: [{
                model: db.providerProfile,
                as: 'providerProfile',
                attributes: ['institution_name', 'institution_type_code', 'logo_file', 'verified_at'],
                include: [{ model: db.institutionType, as: 'institutionType', attributes: nameOnly }]
            }]
        }
    ]
}];

const formatSeekerApplication = (row) => {
    const job = row.job;
    const profile = job.provider && job.provider.providerProfile;
    return {
        code: row.code,
        job_code: row.job_code,
        job_title: job.title,
        job_type: job.job_type,
        job_status: job.job_status,
        job_category_name: job.jobCategory ? job.jobCategory.name : null,
        institution_name: profile ? profile.institution_name : null,
        institution_type_code: profile ? profile.institution_type_code : null,
        institution_type_name: profile && profile.institutionType ? profile.institutionType.name : null,
        institution_logo_url: profile && profile.logo_file ? LOGO_URL_PREFIX + profile.logo_file : null,
        institution_verified: !!(profile && profile.verified_at),
        state_code: job.state_code,
        state_name: job.state ? job.state.name : null,
        city_code: job.city_code,
        city_name: job.city ? job.city.name : null,
        application_status: row.application_status,
        applied_at: row.applied_at,
        status_changed_at: row.status_changed_at,
        ...interviewOf(row),
        // a seeker may withdraw only until the provider acts on the application
        can_withdraw: row.application_status === APPLICATION_STATUS.APPLIED
    };
};

const formatSeekerApplicationDetail = (row) => ({
    ...formatSeekerApplication(row),
    salary_min: row.job.salary_min,
    salary_max: row.job.salary_max,
    vacancies: row.job.vacancies,
    min_qualification: row.job.min_qualification,
    min_experience_years: row.job.min_experience_years,
    last_date: row.job.last_date,
    description: row.job.description,
    cover_note: row.cover_note
});

exports.getSeekerApplications = async (whereCondition = { deleted: false }, page = 1, limit = 10) => {
    try {
        const offset = (page - 1) * limit;
        const { count, rows } = await db.application.findAndCountAll({
            where: whereCondition,
            attributes: APPLICATION_COLUMNS,
            include: seekerIncludes,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['applied_at', 'DESC'], ['id', 'DESC']],
            distinct: true
        });
        return paginate(count, rows.map(formatSeekerApplication), page, limit);
    } catch (err) {
        throw err;
    }
};

exports.getSeekerApplication = async (whereCondition) => {
    try {
        const row = await db.application.findOne({ where: whereCondition, attributes: APPLICATION_COLUMNS, include: seekerIncludes });
        return row ? formatSeekerApplicationDetail(row) : null;
    } catch (err) {
        throw err;
    }
};

// One live application per job and seeker. There is no unique index (a withdrawn row is
// soft-deleted and must not block a new one), so the job row is locked: two concurrent
// applies for the same job queue on it and the second one sees the first application.
// Returns { error } or { data }.
exports.applyToJob = async (job_code, seeker, meta = {}, cover_note = null) => {
    const t = await db.sequelize.transaction();
    const fail = async (error) => {
        await t.rollback();
        return { error };
    };
    try {
        const job = await jobService.getJobForUpdate({ code: job_code, deleted: false, status: 'active' }, t);
        if (!job || job.job_status !== JOB_STATUS.OPEN) return await fail('job_not_open');

        if (await jobService.isJobExpired(job.id, t)) return await fail('job_expired');

        if (!seeker.job_category_codes.includes(job.job_category_code)) return await fail('category_mismatch');

        const existing = await db.application.findOne({
            where: { job_code, seeker_user_code: seeker.code, deleted: false },
            attributes: ['id'],
            transaction: t
        });
        if (existing) return await fail('already_applied');

        const code = await codeGenerator.generateApplicationCode(t);
        const now = new Date();
        await db.application.create({
            code,
            job_code,
            seeker_user_code: seeker.code,
            application_status: APPLICATION_STATUS.APPLIED,
            applied_at: now,
            status_changed_at: null,
            cover_note: emptyToNull(cover_note) || null,
            status: 'active',
            deleted: false,
            created_at: now,
            created_by: meta.userId || null,
            modified_at: now,
            modified_by: null,
            ip_address: meta.ip || null
        }, { transaction: t });

        await t.commit();
        return { data: await exports.getSeekerApplication({ code, deleted: false }) };
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

// The status condition is part of the update, so a provider acting at the same moment wins
exports.withdrawApplication = async (code, seeker_user_code, meta = {}) => {
    try {
        const [updated] = await db.application.update({
            deleted: true,
            status: 'inactive',
            modified_at: new Date(),
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { code, seeker_user_code, application_status: APPLICATION_STATUS.APPLIED, deleted: false } });

        return !!updated;
    } catch (err) {
        throw err;
    }
};
