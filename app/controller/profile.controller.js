const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse, fileResponse } = require('../lib/response.handler');
const profileService = require('../service/profile.service');
const userService = require('../service/user.service');
const { assertMasterCodes, assertCityInState } = require('../helper/master.helper');
const { getMeta } = require('../helper/common.helper');

// email / phone are unique across all users of every role, deleted ones included
const assertAccountFieldsFree = async (body, userCode) => {
    if (body.email && await userService.emailExists(body.email, userCode)) {
        throw new CustomError('email_exists', 400, "An account with this email already exists");
    }
    if (body.phone && await userService.phoneExists(body.phone, userCode)) {
        throw new CustomError('phone_exists', 400, "An account with this phone number already exists");
    }
};

// Location codes: each new code must be active, and the resulting city must sit in the resulting state
const assertLocation = async (body, existing) => {
    await assertMasterCodes({ state_code: body.state_code, city_code: body.city_code });
    if (body.state_code !== undefined || body.city_code !== undefined) {
        const stateCode = body.state_code !== undefined ? body.state_code : existing.state_code;
        const cityCode = body.city_code !== undefined ? body.city_code : existing.city_code;
        await assertCityInState(cityCode, stateCode);
    }
};

const throwServiceError = (error) => {
    if (error === 'email_or_phone_exists') {
        throw new CustomError(error, 400, "An account with this email or phone number already exists");
    }
    throw new CustomError(error, 400, error);
};

// ─── Provider profile ─────────────────────────────────────────────────────

const getProviderProfile = async (req, res) => {
    try {
        const profile_res = await profileService.getProviderProfileByUserCode(req.user.code);
        if (!profile_res) {
            throw new CustomError('profile_not_found', 404, "Provider profile not found");
        }
        successResponse(res, "Provider profile fetched", { user_info: userService.formatUserInfo(req.user), profile_res });
    } catch (err) {
        errorResponse(res, 'getProviderProfile', err);
    }
};

const updateProviderProfile = async (req, res) => {
    try {
        const userCode = req.user.code;
        const body = req.body;

        const existing = await profileService.getProviderProfileByUserCode(userCode);
        if (!existing) {
            throw new CustomError('profile_not_found', 404, "Provider profile not found");
        }

        await assertAccountFieldsFree(body, userCode);
        await assertMasterCodes({ institution_type_code: body.institution_type_code });
        await assertLocation(body, existing);

        // a provider's users.name is the institution name; institution_name wins if both are sent
        const institution_name = body.institution_name !== undefined ? body.institution_name : body.name;

        const result = await profileService.updateProviderProfile(userCode, { ...body, institution_name }, getMeta(req));
        if (result.error) throwServiceError(result.error);

        const [user, profile_res] = await Promise.all([
            userService.getUserByCode(userCode),
            profileService.getProviderProfileByUserCode(userCode)
        ]);
        successResponse(res, "Provider profile updated successfully", { user_info: userService.formatUserInfo(user), profile_res });
    } catch (err) {
        errorResponse(res, 'updateProviderProfile', err);
    }
};

// ─── Seeker profile ───────────────────────────────────────────────────────

const getSeekerProfile = async (req, res) => {
    try {
        const profile_res = await profileService.getSeekerProfileByUserCode(req.user.code);
        if (!profile_res) {
            throw new CustomError('profile_not_found', 404, "Seeker profile not found");
        }
        successResponse(res, "Seeker profile fetched", { user_info: userService.formatUserInfo(req.user), profile_res });
    } catch (err) {
        errorResponse(res, 'getSeekerProfile', err);
    }
};

const updateSeekerProfile = async (req, res) => {
    try {
        const userCode = req.user.code;
        const body = req.body;

        const existing = await profileService.getSeekerProfileByUserCode(userCode);
        if (!existing) {
            throw new CustomError('profile_not_found', 404, "Seeker profile not found");
        }

        await assertAccountFieldsFree(body, userCode);
        await assertMasterCodes({ job_category_code: body.job_category_code });
        for (const code of body.additional_job_category_codes || []) {
            await assertMasterCodes({ job_category_code: code });
        }
        await assertLocation(body, existing);

        const result = await profileService.updateSeekerProfile(userCode, body, getMeta(req));
        if (result.error) throwServiceError(result.error);

        const [user, profile_res] = await Promise.all([
            userService.getUserByCode(userCode),
            profileService.getSeekerProfileByUserCode(userCode)
        ]);
        successResponse(res, "Seeker profile updated successfully", { user_info: userService.formatUserInfo(user), profile_res });
    } catch (err) {
        errorResponse(res, 'updateSeekerProfile', err);
    }
};

// ─── Files ────────────────────────────────────────────────────────────────

const uploadResume = async (req, res) => {
    try {
        const saved = await profileService.setSeekerResume(req.user.code, req.file, getMeta(req));
        if (!saved) {
            throw new CustomError('profile_not_found', 404, "Seeker profile not found");
        }
        const profile_res = await profileService.getSeekerProfileByUserCode(req.user.code);
        successResponse(res, "Resume uploaded successfully", { profile_res });
    } catch (err) {
        errorResponse(res, 'uploadResume', err);
    }
};

const downloadResume = async (req, res) => {
    try {
        const file = await profileService.getSeekerResumeFile(req.user.code);
        if (!file) {
            throw new CustomError('resume_not_found', 404, "No resume uploaded");
        }
        fileResponse(res, 'downloadResume', file.path, file.name);
    } catch (err) {
        errorResponse(res, 'downloadResume', err);
    }
};

const deleteResume = async (req, res) => {
    try {
        const removed = await profileService.removeSeekerResume(req.user.code, getMeta(req));
        if (!removed) {
            throw new CustomError('resume_not_found', 404, "No resume uploaded");
        }
        successResponse(res, "Resume deleted successfully");
    } catch (err) {
        errorResponse(res, 'deleteResume', err);
    }
};

const uploadLogo = async (req, res) => {
    try {
        const saved = await profileService.setProviderLogo(req.user.code, req.file, getMeta(req));
        if (!saved) {
            throw new CustomError('profile_not_found', 404, "Provider profile not found");
        }
        const profile_res = await profileService.getProviderProfileByUserCode(req.user.code);
        successResponse(res, "Logo uploaded successfully", { profile_res });
    } catch (err) {
        errorResponse(res, 'uploadLogo', err);
    }
};

const deleteLogo = async (req, res) => {
    try {
        const removed = await profileService.removeProviderLogo(req.user.code, getMeta(req));
        if (!removed) {
            throw new CustomError('logo_not_found', 404, "No logo uploaded");
        }
        successResponse(res, "Logo deleted successfully");
    } catch (err) {
        errorResponse(res, 'deleteLogo', err);
    }
};

module.exports = {
    // Provider profile
    getProviderProfile,
    updateProviderProfile,
    // Seeker profile
    getSeekerProfile,
    updateSeekerProfile,
    // Files
    uploadResume,
    downloadResume,
    deleteResume,
    uploadLogo,
    deleteLogo
};
