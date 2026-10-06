const crypto = require('crypto');
const { Op } = require('sequelize');
const db = require('../model');
const { OTP_LENGTH, OTP_TTL_MINUTES, OTP_MAX_ATTEMPTS, OTP_RESEND_SECONDS } = require('../constants/account.constant');

// Codes are stored as an HMAC keyed with the JWT secret, so a database leak doesn't reveal
// live codes (6 digits would be trivial to brute-force from a plain hash)
const hashOtp = (otp, user_code, purpose) =>
    crypto.createHmac('sha256', process.env.JWT_SECRET_KEY).update(`${user_code}:${purpose}:${otp}`).digest('hex');

const generateOtp = () => String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');

// Seconds until a new code may be requested (0 when allowed)
exports.getResendWait = async (user_code, purpose) => {
    try {
        const last = await db.userOtp.findOne({
            where: { user_code, purpose },
            attributes: ['created_at'],
            order: [['id', 'DESC']]
        });
        if (!last) return 0;
        const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
        return Math.max(0, Math.ceil(OTP_RESEND_SECONDS - elapsed));
    } catch (err) {
        throw err;
    }
};

// Issues a new code and retires the user's earlier unused codes for the same purpose.
// Returns the plain code for the caller to send; only its hash is stored.
exports.issueOtp = async ({ user_code, purpose, channel, destination }, meta = {}) => {
    const t = await db.sequelize.transaction();
    try {
        const now = new Date();
        await db.userOtp.update(
            { deleted: true, status: 'inactive', modified_at: now },
            { where: { user_code, purpose, consumed_at: null, deleted: false }, transaction: t }
        );

        const otp = generateOtp();
        await db.userOtp.create({
            user_code,
            purpose,
            channel,
            destination,
            otp_hash: hashOtp(otp, user_code, purpose),
            expires_at: new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000),
            attempts: 0,
            consumed_at: null,
            status: 'active',
            deleted: false,
            created_at: now,
            created_by: meta.userId || null,
            modified_at: now,
            modified_by: null,
            ip_address: meta.ip || null
        }, { transaction: t });

        await t.commit();
        return otp;
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

// Checks and spends a code inside the caller's transaction. The row is locked so two guesses
// at once can't both pass the attempts check. Returns { error } or { data: { destination } }.
exports.consumeOtp = async ({ user_code, purpose, otp }, transaction) => {
    try {
        const row = await db.userOtp.findOne({
            where: { user_code, purpose, consumed_at: null, deleted: false, expires_at: { [Op.gt]: new Date() } },
            order: [['id', 'DESC']],
            lock: transaction.LOCK.UPDATE,
            transaction
        });
        if (!row) return { error: 'otp_invalid' };
        if (row.attempts >= OTP_MAX_ATTEMPTS) return { error: 'otp_attempts_exceeded' };

        const expected = Buffer.from(row.otp_hash, 'hex');
        const given = Buffer.from(hashOtp(String(otp), user_code, purpose), 'hex');
        if (!crypto.timingSafeEqual(expected, given)) {
            await row.increment('attempts', { transaction });
            return { error: row.attempts + 1 >= OTP_MAX_ATTEMPTS ? 'otp_attempts_exceeded' : 'otp_invalid' };
        }

        await row.update({ consumed_at: new Date(), modified_at: new Date() }, { transaction });
        return { data: { destination: row.destination, channel: row.channel } };
    } catch (err) {
        throw err;
    }
};
