module.exports = (sequelize, DataTypes) => {
    const ProviderProfile = sequelize.define("provider_profile", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        user_code: { type: DataTypes.STRING(20), allowNull: false },               // FK: users.code
        // kept equal to users.name for providers
        institution_name: { type: DataTypes.STRING(150), allowNull: false },
        institution_type_code: { type: DataTypes.STRING(20), allowNull: false },   // FK: institution_types.code
        contact_person: { type: DataTypes.STRING(150), allowNull: true },
        designation: { type: DataTypes.STRING(100), allowNull: true },
        established_year: { type: DataTypes.INTEGER, allowNull: true },
        website: { type: DataTypes.STRING(255), allowNull: true },
        about: { type: DataTypes.TEXT, allowNull: true },
        address: { type: DataTypes.STRING(500), allowNull: true },
        state_code: { type: DataTypes.STRING(20), allowNull: true },               // FK: states.code
        city_code: { type: DataTypes.STRING(20), allowNull: true },                // FK: cities.code
        pincode: { type: DataTypes.STRING(6), allowNull: true },
        logo_file: { type: DataTypes.STRING(255), allowNull: true },      // file name under UPLOAD_DIR/logos
        // set by the admin after checking the institution is real
        verified_at: { type: DataTypes.DATE, allowNull: true },
        verified_by: { type: DataTypes.INTEGER, allowNull: true },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "provider_profiles",
        indexes: [
            { fields: ['user_code'], name: 'idx_provider_profile_user_code', unique: true },
            { fields: ['institution_type_code'], name: 'idx_provider_profile_institution_type_code' },
            { fields: ['institution_name'], name: 'idx_provider_profile_institution_name' },
            { fields: ['state_code'], name: 'idx_provider_profile_state_code' },
            { fields: ['city_code'], name: 'idx_provider_profile_city_code' },
            { fields: ['status'], name: 'idx_provider_profile_status' }
        ]
    });

    return ProviderProfile;
};
