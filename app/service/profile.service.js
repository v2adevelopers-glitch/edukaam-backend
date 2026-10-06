const db = require('../model');
const userService = require('./user.service');
const { ROLE_CODES } = require('../constants/role.constant');
const { emptyToNull, isUniqueViolationOn } = require('../helper/common.helper');
const { toDateOnly } = require('../helper/query.helper');
const fileStorage = require('../helper/file_storage.helper');
const { UPLOADS, LOGO_URL_PREFIX } = require('../constants/file.constant');

const nameOnly = ['code', 'name'];

const providerIncludes = [
    { model: db.institutionType, as: 'institutionType', attributes: nameOnly },
    { model: db.state, as: 'state', attributes: nameOnly },
    { model: db.city, as: 'city', attributes: nameOnly }
];

const seekerIncludes = [
    { model: db.jobCategory, as: 'jobCategory', attributes: nameOnly },
    { model: db.state, as: 'state', attributes: nameOnly },
    { model: db.city, as: 'city', attributes: nameOnly }
];

// ─── Response shapes ──────────────────────────────────────────────────────

const formatProviderProfile = (p) => {
    if (!p) return null;
    return {
        user_code: p.user_code,
        institution_name: p.institution_name,
        institution_type_code: p.institution_type_code,
        institution_type_name: p.institutionType ? p.institutionType.name : null,
        contact_person: p.contact_person,
        designation: p.designation,
        established_year: p.established_year,
        website: p.website,
        about: p.about,
        address: p.address,
        state_code: p.state_code,
        state_name: p.state ? p.state.name : null,
        city_code: p.city_code,
        city_name: p.city ? p.city.name : null,
        pincode: p.pincode,
        logo_url: p.logo_file ? LOGO_URL_PREFIX + p.logo_file : null,
        institution_verified: !!p.verified_at,
        modified_at: p.modified_at
    };
};

const formatSeekerProfile = (p) => {
    if (!p) return null;
    return {
        user_code: p.user_code,
        job_category_code: p.job_category_code,
        job_category_name: p.jobCategory ? p.jobCategory.name : null,
        gender: p.gender,
        date_of_birth: p.date_of_birth,
        qualification: p.qualification,
        experience_years: p.experience_years,
        skills: p.skills,
        expected_salary: p.expected_salary,
        state_code: p.state_code,
        state_name: p.state ? p.state.name : null,
        city_code: p.city_code,
        city_name: p.city ? p.city.name : null,
        about: p.about,
        has_resume: !!p.resume_file,
        resume_name: p.resume_name || null,
        resume_uploaded_at: p.resume_uploaded_at || null,
        modified_at: p.modified_at
    };
};

exports.formatSeekerProfile = formatSeekerProfile;

// ─── Reads ────────────────────────────────────────────────────────────────

exports.getProviderProfileByUserCode = async (user_code) => {
    try {
        const profile = await db.providerProfile.findOne({ where: { user_code, deleted: false }, include: providerIncludes });
        return formatProviderProfile(profile);
    } catch (err) {
        throw err;
    }
};

exports.getSeekerProfileByUserCode = async (user_code) => {
    try {
        const profile = await db.seekerProfile.findOne({ where: { user_code, deleted: false }, include: seekerIncludes });
        return formatSeekerProfile(profile);
    } catch (err) {
        throw err;
    }
};

// profile_res for login / me: the role's profile, null for admin
exports.getProfileForRole = async (role_code, user_code) => {
    try {
        if (role_code === ROLE_CODES.JOB_PROVIDER) return await exports.getProviderProfileByUserCode(user_code);
        if (role_code === ROLE_CODES.JOB_SEEKER) return await exports.getSeekerProfileByUserCode(user_code);
        return null;
    } catch (err) {
        throw err;
    }
};

// ─── Writes ───────────────────────────────────────────────────────────────

const auditOnCreate = (meta) => ({
    status: 'active',
    deleted: false,
    created_at: new Date(),
    created_by: meta.userId || null,
    modified_at: new Date(),
    modified_by: null,
    ip_address: meta.ip || null
});

const auditOnUpdate = (meta) => ({
    modified_at: new Date(),
    modified_by: meta.userId || null,
    ip_address: meta.ip || null
});

// Empty profiles created at registration (inside the registration transaction)
exports.createProviderProfile = async (payload, meta = {}, transaction = null) => {
    try {
        return await db.providerProfile.create({
            user_code: payload.user_code,
            institution_name: payload.institution_name,
            institution_type_code: payload.institution_type_code,
            ...auditOnCreate(meta)
        }, { transaction });
    } catch (err) {
        throw err;
    }
};

exports.createSeekerProfile = async (payload, meta = {}, transaction = null) => {
    try {
        return await db.seekerProfile.create({
            user_code: payload.user_code,
            job_category_code: payload.job_category_code,
            ...auditOnCreate(meta)
        }, { transaction });
    } catch (err) {
        throw err;
    }
};

// users row (name/phone/email) and profile row change together or not at all.
// Returns { error } when a concurrent request took the email/phone, else { data }.
const updateWithAccount = async (user_code, account, writeProfile) => {
    const t = await db.sequelize.transaction();
    try {
        const hasAccountChange = ['name', 'phone', 'email'].some(f => account.fields[f] !== undefined);
        if (hasAccountChange) {
            await userService.updateAccount(user_code, account.fields, account.meta, t);
        }
        await writeProfile(t);
        await t.commit();
        return { data: true };
    } catch (err) {
        await t.rollback();
        if (isUniqueViolationOn(err, ['email', 'phone'])) return { error: 'email_or_phone_exists' };
        throw err;
    }
};

// For providers users.name and institution_name are the same value; the controller resolves it
exports.updateProviderProfile = async (user_code, payload, meta = {}) => {
    try {
        return await updateWithAccount(user_code, {
            fields: { name: payload.institution_name, phone: payload.phone, email: payload.email },
            meta
        }, (t) => db.providerProfile.update({
            institution_name: payload.institution_name,
            institution_type_code: payload.institution_type_code,
            contact_person: emptyToNull(payload.contact_person),
            designation: emptyToNull(payload.designation),
            established_year: payload.established_year,
            website: emptyToNull(payload.website),
            about: emptyToNull(payload.about),
            address: emptyToNull(payload.address),
            state_code: payload.state_code,
            city_code: payload.city_code,
            pincode: emptyToNull(payload.pincode),
            ...auditOnUpdate(meta)
        }, { where: { user_code, deleted: false }, transaction: t }));
    } catch (err) {
        throw err;
    }
};

exports.updateSeekerProfile = async (user_code, payload, meta = {}) => {
    try {
        return await updateWithAccount(user_code, {
            fields: { name: payload.name, phone: payload.phone, email: payload.email },
            meta
        }, (t) => db.seekerProfile.update({
            job_category_code: payload.job_category_code,
            gender: payload.gender,
            // toDateOnly(undefined) is null, which would clear the column on every PATCH
            date_of_birth: payload.date_of_birth === undefined ? undefined : toDateOnly(payload.date_of_birth),
            qualification: emptyToNull(payload.qualification),
            experience_years: payload.experience_years,
            skills: emptyToNull(payload.skills),
            expected_salary: payload.expected_salary,
            state_code: payload.state_code,
            city_code: payload.city_code,
            about: emptyToNull(payload.about),
            ...auditOnUpdate(meta)
        }, { where: { user_code, deleted: false }, transaction: t }));
    } catch (err) {
        throw err;
    }
};

// ─── Files ────────────────────────────────────────────────────────────────

// Stores the new file, points the profile at it, then deletes the file it replaces. A failed
// DB write removes the new file again, so no orphan or dangling reference is left.
const replaceProfileFile = async (model, user_code, upload, column, file, extraColumns, meta) => {
    const existing = await model.findOne({ where: { user_code, deleted: false }, attributes: ['id', column] });
    if (!existing) return false;

    const fileName = await fileStorage.saveFile(upload.dir, file.buffer, file.detectedType);
    try {
        await model.update({
            [column]: fileName,
            ...extraColumns,
            modified_at: new Date(),
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { id: existing.id } });
    } catch (err) {
        await fileStorage.removeFile(upload.dir, fileName);
        throw err;
    }
    await fileStorage.removeFile(upload.dir, existing[column]);
    return true;
};

const clearProfileFile = async (model, user_code, upload, column, extraColumns, meta) => {
    const existing = await model.findOne({ where: { user_code, deleted: false }, attributes: ['id', column] });
    if (!existing || !existing[column]) return false;

    await model.update({
        [column]: null,
        ...extraColumns,
        modified_at: new Date(),
        modified_by: meta.userId || null,
        ip_address: meta.ip || null
    }, { where: { id: existing.id } });
    await fileStorage.removeFile(upload.dir, existing[column]);
    return true;
};

exports.setSeekerResume = async (user_code, file, meta = {}) => {
    try {
        return await replaceProfileFile(db.seekerProfile, user_code, UPLOADS.RESUME, 'resume_file', file, {
            resume_name: fileStorage.cleanOriginalName(file.originalname),
            resume_uploaded_at: new Date()
        }, meta);
    } catch (err) {
        throw err;
    }
};

exports.removeSeekerResume = async (user_code, meta = {}) => {
    try {
        return await clearProfileFile(db.seekerProfile, user_code, UPLOADS.RESUME, 'resume_file',
            { resume_name: null, resume_uploaded_at: null }, meta);
    } catch (err) {
        throw err;
    }
};

// { path, name } of the seeker's resume when the file is really there, else null
exports.getSeekerResumeFile = async (user_code) => {
    try {
        const profile = await db.seekerProfile.findOne({ where: { user_code, deleted: false }, attributes: ['resume_file', 'resume_name'] });
        const filePath = profile && fileStorage.storedFilePath(UPLOADS.RESUME.dir, profile.resume_file);
        if (!filePath || !await fileStorage.fileExists(filePath)) return null;
        return { path: filePath, name: profile.resume_name || `resume.${profile.resume_file.split('.').pop()}` };
    } catch (err) {
        throw err;
    }
};

exports.setProviderLogo = async (user_code, file, meta = {}) => {
    try {
        return await replaceProfileFile(db.providerProfile, user_code, UPLOADS.LOGO, 'logo_file', file, {}, meta);
    } catch (err) {
        throw err;
    }
};

exports.removeProviderLogo = async (user_code, meta = {}) => {
    try {
        return await clearProfileFile(db.providerProfile, user_code, UPLOADS.LOGO, 'logo_file', {}, meta);
    } catch (err) {
        throw err;
    }
};

// Path of a stored logo that belongs to a live provider profile, else null
exports.getLogoFile = async (fileName) => {
    try {
        const filePath = fileStorage.storedFilePath(UPLOADS.LOGO.dir, fileName);
        if (!filePath) return null;
        const owner = await db.providerProfile.findOne({ where: { logo_file: fileName, deleted: false }, attributes: ['id'] });
        if (!owner || !await fileStorage.fileExists(filePath)) return null;
        return filePath;
    } catch (err) {
        throw err;
    }
};
