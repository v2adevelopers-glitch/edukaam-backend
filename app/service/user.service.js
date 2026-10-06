const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const db = require('../model');
const { getRoleKey } = require('../constants/role.constant');

const roleInclude = { model: db.role, as: 'role', attributes: ['code', 'role_type'] };

// ─── Response shapes ──────────────────────────────────────────────────────

// Public fields of a user: never the password hash, lockout counter or audit columns
exports.formatUserInfo = (user) => {
    if (!user) return null;
    return {
        code: user.code,
        role_code: user.role_code,
        name: user.name,
        phone: user.phone,
        email: user.email,
        status: user.status,
        last_login: user.last_login,
        created_at: user.created_at
    };
};

exports.formatRoleInfo = (user) => ({
    code: user.role_code,
    role_type: user.role ? user.role.role_type : null,
    role_key: getRoleKey(user.role_code)
});

// ─── Auth ─────────────────────────────────────────────────────────────────

// Login looks users up by email or phone alone, so both are unique across all roles
exports.getUserInfoByUsername = async (username) => {
    try {
        return await db.user.findOne({
            where: { deleted: false, [Op.or]: [{ email: username }, { phone: username }] },
            include: [roleInclude]
        });
    } catch (err) {
        throw err;
    }
};

exports.getUserByIdAndRoleCode = async (id, role_code) => {
    try {
        return await db.user.findOne({ where: { id, role_code, deleted: false }, include: [roleInclude] });
    } catch (err) {
        throw err;
    }
};

exports.getUserByCode = async (code, transaction = null) => {
    try {
        return await db.user.findOne({ where: { code, deleted: false }, include: [roleInclude], transaction });
    } catch (err) {
        throw err;
    }
};

exports.hashPassword = (password) => bcrypt.hash(password, 12);

exports.recordSuccessfulLogin = (user_id) =>
    db.user.update({ last_login: new Date(), failed_login_attempts: 0 }, { where: { id: user_id, deleted: false } });

exports.incrementFailedLoginAttempts = (user_id) =>
    db.user.increment('failed_login_attempts', { where: { id: user_id, deleted: false } });

// ─── Duplicate checks ─────────────────────────────────────────────────────

// Both include soft-deleted rows: users.email and users.phone are unique across all rows
exports.emailExists = async (email, excludeCode = null) => {
    try {
        const whereCondition = { email };
        if (excludeCode) whereCondition.code = { [Op.ne]: excludeCode };
        return !!(await db.user.findOne({ where: whereCondition, attributes: ['id'] }));
    } catch (err) {
        throw err;
    }
};

exports.phoneExists = async (phone, excludeCode = null) => {
    try {
        const whereCondition = { phone };
        if (excludeCode) whereCondition.code = { [Op.ne]: excludeCode };
        return !!(await db.user.findOne({ where: whereCondition, attributes: ['id'] }));
    } catch (err) {
        throw err;
    }
};

// ─── Writes (called by orchestration services inside their transaction) ───

exports.createUser = async (payload, meta = {}, transaction = null) => {
    try {
        return await db.user.create({
            code: payload.code,
            role_code: payload.role_code,
            name: payload.name,
            phone: payload.phone,
            email: payload.email,
            password: payload.passwordHash,
            failed_login_attempts: 0,
            last_login: null,
            status: 'active',
            deleted: false,
            created_at: new Date(),
            created_by: meta.userId || null,
            modified_at: new Date(),
            modified_by: null,
            ip_address: meta.ip || null
        }, { transaction });
    } catch (err) {
        throw err;
    }
};

// name / phone / email only; update skips undefined values, so only the fields sent change
exports.updateAccount = async (code, payload, meta = {}, transaction = null) => {
    try {
        const [updated] = await db.user.update({
            name: payload.name,
            phone: payload.phone,
            email: payload.email,
            modified_at: new Date(),
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { code, deleted: false }, transaction });

        return !!updated;
    } catch (err) {
        throw err;
    }
};
