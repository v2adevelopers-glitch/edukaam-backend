const { QueryTypes } = require('sequelize');
const db = require('../model');
const jobService = require('./job.service');
const { APPLICATION_STATUSES, APPLICATION_STATUS } = require('../constants/job.constant');

const select = (sql, replacements) => db.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

// [{ application_status, count }] in a fixed order, every status present (0 when none)
const zeroFillStatuses = (rows) => {
    const counts = new Map(rows.map(r => [r.application_status, Number(r.count)]));
    return APPLICATION_STATUSES.map(status => ({ application_status: status, count: counts.get(status) || 0 }));
};

const countOf = (byStatus, status) => byStatus.find(s => s.application_status === status).count;

// ─── Provider ─────────────────────────────────────────────────────────────

exports.getProviderDashboard = async (provider_user_code) => {
    try {
        const replacements = { provider_user_code };

        const [openJobs, statusRows, applicantsPerJob, recentApplicants] = await Promise.all([
            select(`SELECT COUNT(*) AS count FROM jobs
                    WHERE provider_user_code = :provider_user_code AND deleted = false AND job_status = 'open'`, replacements),

            select(`SELECT a.application_status, COUNT(*) AS count
                    FROM applications a
                    JOIN jobs j ON j.code = a.job_code AND j.deleted = false
                    WHERE j.provider_user_code = :provider_user_code AND a.deleted = false
                    GROUP BY a.application_status`, replacements),

            select(`SELECT j.code AS job_code, j.title AS job_title, j.job_status, COUNT(a.id) AS applicants_count
                    FROM jobs j
                    LEFT JOIN applications a ON a.job_code = j.code AND a.deleted = false
                    WHERE j.provider_user_code = :provider_user_code AND j.deleted = false
                    GROUP BY j.id, j.code, j.title, j.job_status, j.created_at
                    ORDER BY applicants_count DESC, j.created_at DESC
                    LIMIT 5`, replacements),

            // no phone/email here: contact details only appear in the applications list and detail
            select(`SELECT a.code AS application_code, a.application_status, a.applied_at,
                           j.code AS job_code, j.title AS job_title,
                           u.code AS applicant_code, u.name AS applicant_name,
                           sp.qualification, sp.experience_years
                    FROM applications a
                    JOIN jobs j ON j.code = a.job_code AND j.deleted = false
                    JOIN users u ON u.code = a.seeker_user_code
                    LEFT JOIN seeker_profiles sp ON sp.user_code = u.code AND sp.deleted = false
                    WHERE j.provider_user_code = :provider_user_code AND a.deleted = false
                    ORDER BY a.applied_at DESC, a.id DESC
                    LIMIT 5`, replacements)
        ]);

        const applications_by_status = zeroFillStatuses(statusRows);

        return {
            open_jobs: Number(openJobs[0].count),
            total_applicants: applications_by_status.reduce((sum, s) => sum + s.count, 0),
            shortlisted: countOf(applications_by_status, APPLICATION_STATUS.SHORTLISTED),
            hired: countOf(applications_by_status, APPLICATION_STATUS.HIRED),
            applications_by_status,
            applicants_per_job: applicantsPerJob.map(r => ({ ...r, applicants_count: Number(r.applicants_count) })),
            recent_applicants: recentApplicants
        };
    } catch (err) {
        throw err;
    }
};

// ─── Seeker ───────────────────────────────────────────────────────────────

// openingsWhere is null when the seeker has no category yet (newest_jobs is then empty)
exports.getSeekerDashboard = async (seeker_user_code, openingsWhere) => {
    try {
        const [statusRows, newestJobs] = await Promise.all([
            select(`SELECT application_status, COUNT(*) AS count FROM applications
                    WHERE seeker_user_code = :seeker_user_code AND deleted = false
                    GROUP BY application_status`, { seeker_user_code }),
            openingsWhere ? jobService.getOpenings(openingsWhere, seeker_user_code, 1, 5) : { data: [] }
        ]);

        const applications_by_status = zeroFillStatuses(statusRows);

        return {
            applications_sent: applications_by_status.reduce((sum, s) => sum + s.count, 0),
            shortlisted: countOf(applications_by_status, APPLICATION_STATUS.SHORTLISTED),
            hired: countOf(applications_by_status, APPLICATION_STATUS.HIRED),
            applications_by_status,
            newest_jobs: newestJobs.data
        };
    } catch (err) {
        throw err;
    }
};
