module.exports = (sequelize, DataTypes) => {
    const RoleModuleAccessMapping = sequelize.define("role_module_access_mapping", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        role_code: { type: DataTypes.INTEGER, allowNull: false },
        module_id: { type: DataTypes.INTEGER, allowNull: false },
        menu_access: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        read_access: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        write_access: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        update_access: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        delete_access: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        full_access: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "role_module_access_mapping",
        indexes: [
            { fields: ['role_code', 'module_id'], name: 'idx_role_module_access_role_module', unique: true },
            { fields: ['module_id'], name: 'idx_role_module_access_module' }
        ]
    });

    return RoleModuleAccessMapping;
};
