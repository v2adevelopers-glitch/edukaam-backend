module.exports = (sequelize, DataTypes) => {
    // One-time codes for password reset and email/phone verification. Only an HMAC of the code
    // is stored; a code is spent once consumed_at is set.
    const UserOtp = sequelize.define("user_otp", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        user_code: { type: DataTypes.STRING(20), allowNull: false },               // FK: users.code
        purpose: { type: DataTypes.ENUM('password_reset', 'verify_email', 'verify_phone'), allowNull: false },
        channel: { type: DataTypes.ENUM('email', 'phone'), allowNull: false },
        destination: { type: DataTypes.STRING(150), allowNull: false },           // address/number it was sent to
        otp_hash: { type: DataTypes.STRING(64), allowNull: false },
        expires_at: { type: DataTypes.DATE, allowNull: false },
        attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        consumed_at: { type: DataTypes.DATE, allowNull: true },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "user_otps",
        indexes: [
            { fields: ['user_code', 'purpose'], name: 'idx_user_otp_user_purpose' },
            { fields: ['expires_at'], name: 'idx_user_otp_expires_at' }
        ]
    });

    return UserOtp;
};
