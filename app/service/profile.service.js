const db = require('../model');
const userService = require('./user.service');
const { ROLE_CODES } = require('../constants/role.constant');
const { emptyToNull, isUniqueViolationOn } = require('../helper/common.helper');
const { toDateOnly } = require('../helper/query.helper');

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
