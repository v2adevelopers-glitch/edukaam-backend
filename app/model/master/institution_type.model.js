module.exports = (sequelize, DataTypes) => {
    const InstitutionType = sequelize.define("institution_type", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        code: { type: DataTypes.STRING(20), allowNull: false },
        name: { type: DataTypes.STRING(100), allowNull: false },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "institution_types",
        indexes: [
            { fields: ['code'], name: 'idx_institution_type_code', unique: true },
            { fields: ['name'], name: 'idx_institution_type_name', unique: true },
            { fields: ['status'], name: 'idx_institution_type_status' }
        ]
    });

    return InstitutionType;
};
