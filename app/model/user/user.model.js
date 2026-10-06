module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define("user", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        code: { type: DataTypes.STRING(20), allowNull: false },
        role_code: { type: DataTypes.INTEGER, allowNull: false },   // FK: association in model/index.js
        // person's name for seekers, institution name for providers
        name: { type: DataTypes.STRING(150), allowNull: false },
        phone: { type: DataTypes.STRING(15), allowNull: false },
        email: { type: DataTypes.STRING(150), allowNull: false },
        password: { type: DataTypes.STRING(255), allowNull: true },
        failed_login_attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
        last_login: { type: DataTypes.DATE, allowNull: true },
        // bumped on logout, password change and deactivation; tokens carrying an older value are refused
        token_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        email_verified_at: { type: DataTypes.DATE, allowNull: true },
        phone_verified_at: { type: DataTypes.DATE, allowNull: true },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "users",
        indexes: [
            { fields: ['code'], name: 'idx_user_code', unique: true },
            { fields: ['email'], name: 'idx_user_email', unique: true },
            { fields: ['phone'], name: 'idx_user_phone', unique: true },
            { fields: ['role_code'], name: 'idx_user_role_code' },
            { fields: ['status'], name: 'idx_user_status' }
        ]
    });

    // Keep password hashes out of every response that serialises a user instance.
    // Plain objects (get({ plain: true }), raw: true) bypass this, so strip them there yourself.
    User.prototype.toJSON = function () {
        const values = { ...this.get({ plain: true }) };
        delete values.password;
        return values;
    };

    return User;
};
