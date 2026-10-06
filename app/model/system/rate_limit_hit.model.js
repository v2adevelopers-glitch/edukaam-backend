module.exports = (sequelize, DataTypes) => {
    // Shared rate-limit counters (one row per limiter + client key), so every app process
    // counts against the same window
    const RateLimitHit = sequelize.define("rate_limit_hit", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        rl_key: { type: DataTypes.STRING(191), allowNull: false },
        hits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        reset_at: { type: DataTypes.DATE(3), allowNull: false },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "rate_limit_hits",
        indexes: [
            { fields: ['rl_key'], name: 'idx_rate_limit_hit_rl_key', unique: true },
            { fields: ['reset_at'], name: 'idx_rate_limit_hit_reset_at' }
        ]
    });

    return RateLimitHit;
};
