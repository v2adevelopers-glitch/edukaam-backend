const { Op } = require('sequelize');
const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse, fileResponse } = require('../lib/response.handler');
const talentService = require('../service/talent.service');
const profileService = require('../service/profile.service');

// Contact details and resumes are only for institutions the admin has verified
const isVerifiedProvider = async (userCode) => {
    const profile = await profileService.getProviderProfileByUserCode(userCode);
    return !!(profile && profile.institution_verified);
};

// Seekers who opted in to search and have chosen a category
const discoverableWhere = () => ({ deleted: false, is_discoverable: true, job_category_code: { [Op.ne]: null } });

// ─── Candidates ───────────────────────────────────────────────────────────

const getAllCandidates = async (req, res) => {
    try {
        const { page, limit, search, job_category_code, state_code, city_code, min_experience_years, max_expected_salary } = req.query;

        let whereCondition = discoverableWhere();
        const conditions = [];

        if (job_category_code) {
            conditions.push(talentService.inCategoryWhere(job_category_code));
        }
        if (state_code) {
            whereCondition.state_code = state_code;
        }
        if (city_code) {
            whereCondition.city_code = city_code;
        }
        if (min_experience_years !== undefined) {
            whereCondition.experience_years = { [Op.gte]: min_experience_years };
        }
        if (max_expected_salary !== undefined) {
            // a candidate who didn't state a salary still matches
            conditions.push({ [Op.or]: [{ expected_salary: { [Op.lte]: max_expected_salary } }, { expected_salary: null }] });
        }
        if (search) {
            conditions.push({
                [Op.or]: [
                    { '$user.name$': { [Op.like]: `%${search}%` } },
                    { qualification: { [Op.like]: `%${search}%` } },
                    { skills: { [Op.like]: `%${search}%` } }
                ]
            });
        }
        if (conditions.length) {
            whereCondition[Op.and] = conditions;
        }

        const candidates = await talentService.getCandidates(whereCondition, page, limit);
        successResponse(res, "Candidates fetched successfully", candidates);
    } catch (err) {
        errorResponse(res, 'getAllCandidates', err);
    }
};

const getSingleCandidate = async (req, res) => {
    try {
        const verified = await isVerifiedProvider(req.user.code);
        const candidate = await talentService.getCandidate({ ...discoverableWhere(), user_code: req.params.usercode }, verified);
        if (!candidate) {
            throw new CustomError('candidate_not_found', 404, "Candidate not found");
        }

        const { shares_contact, ...data } = candidate;
        let contact_hidden_reason = null;
        if (!shares_contact) contact_hidden_reason = 'candidate_not_sharing';
        else if (!verified) contact_hidden_reason = 'institution_not_verified';

        successResponse(res, "Candidate info fetched", { ...data, contact_hidden_reason });
    } catch (err) {
        errorResponse(res, 'getSingleCandidate', err);
    }
};

const downloadCandidateResume = async (req, res) => {
    try {
        const verified = await isVerifiedProvider(req.user.code);
        const candidate = await talentService.getCandidate({ ...discoverableWhere(), user_code: req.params.usercode }, verified);
        if (!candidate) {
            throw new CustomError('candidate_not_found', 404, "Candidate not found");
        }
        if (!candidate.contact_visible) {
            throw new CustomError('resume_not_shared', 403, "This candidate's resume is shared only with verified institutions, and only if the candidate allows it");
        }

        const file = await profileService.getSeekerResumeFile(candidate.code);
        if (!file) {
            throw new CustomError('resume_not_found', 404, "The candidate has not uploaded a resume");
        }
        fileResponse(res, 'downloadCandidateResume', file.path, file.name);
    } catch (err) {
        errorResponse(res, 'downloadCandidateResume', err);
    }
};

module.exports = {
    // Candidates
    getAllCandidates,
    getSingleCandidate,
    downloadCandidateResume
};
