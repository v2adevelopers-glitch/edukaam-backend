module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define("role", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        code: { type: DataTypes.INTEGER, allowNull: false },
        role_type: { type: DataTypes.STRING(100), allowNull: false },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "roles",
        indexes: [
            { fields: ['code'], name: 'idx_role_code', unique: true },
            { fields: ['status'], name: 'idx_role_status' }
        ]
    });

    return Role;
};
