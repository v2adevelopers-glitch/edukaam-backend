module.exports = (sequelize, DataTypes) => {
    const ApiModuleMapping = sequelize.define("api_module_mapping", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        module_id: { type: DataTypes.INTEGER, allowNull: false },
        // route pattern, not a real URL: /api/v1/job/jobs/:jobid
        api_endpoint: { type: DataTypes.STRING(255), allowNull: false },
        api_method: { type: DataTypes.ENUM('GET', 'POST', 'PATCH', 'PUT', 'DELETE'), allowNull: false },
        api_slug: { type: DataTypes.STRING(100), allowNull: true },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "api_module_mapping",
        indexes: [
            { fields: ['api_endpoint', 'api_method'], name: 'idx_api_module_mapping_endpoint_method', unique: true },
            { fields: ['module_id'], name: 'idx_api_module_mapping_module' }
        ]
    });

    return ApiModuleMapping;
};
