const db = require('../model');
const userService = require('./user.service');
const profileService = require('./profile.service');
const { generateUserCode } = require('../helper/code_generator.helper');
const { isUniqueViolationOn } = require('../helper/common.helper');
const { ROLE_CODES, getRoleCodeByKey } = require('../constants/role.constant');

// Orchestrates self-registration: the user and their empty profile are created together or
// not at all. Returns { data } or { error } (a concurrent request took the email/phone).
exports.registerUser = async (payload, meta = {}) => {
    // bcrypt is slow on purpose, so hash before opening the transaction
    const passwordHash = await userService.hashPassword(payload.password);
    const role_code = getRoleCodeByKey(payload.role_key);

    const t = await db.sequelize.transaction();
    try {
        const code = await generateUserCode(t);

        await userService.createUser({
            code,
            role_code,
            name: payload.name,
            phone: payload.phone,
            email: payload.email,
            passwordHash
        }, meta, t);

        if (role_code === ROLE_CODES.JOB_PROVIDER) {
            await profileService.createProviderProfile({
                user_code: code,
                institution_name: payload.name,
                institution_type_code: payload.institution_type_code
            }, meta, t);
        } else {
            await profileService.createSeekerProfile({
                user_code: code,
                job_category_code: payload.job_category_code
            }, meta, t);
        }

        await t.commit();
        return { data: { user_code: code, role_key: payload.role_key } };
    } catch (err) {
        await t.rollback();
        if (isUniqueViolationOn(err, ['email', 'phone'])) return { error: 'email_or_phone_exists' };
        throw err;
    }
};
