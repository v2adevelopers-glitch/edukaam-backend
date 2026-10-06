module.exports = (sequelize, DataTypes) => {
    const SeekerProfile = sequelize.define("seeker_profile", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        user_code: { type: DataTypes.STRING(20), allowNull: false },               // FK: users.code
        // set at registration; nullable so an incomplete profile is a 400, not a crash
        job_category_code: { type: DataTypes.STRING(20), allowNull: true },        // FK: job_categories.code
        gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: true },
        date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
        qualification: { type: DataTypes.STRING(150), allowNull: true },
        experience_years: { type: DataTypes.INTEGER, allowNull: true },
        skills: { type: DataTypes.TEXT, allowNull: true },                         // comma separated
        expected_salary: { type: DataTypes.DECIMAL(12, 2), allowNull: true },      // monthly, INR
        state_code: { type: DataTypes.STRING(20), allowNull: true },               // FK: states.code
        city_code: { type: DataTypes.STRING(20), allowNull: true },                // FK: cities.code
        about: { type: DataTypes.TEXT, allowNull: true },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "seeker_profiles",
        indexes: [
            { fields: ['user_code'], name: 'idx_seeker_profile_user_code', unique: true },
            { fields: ['job_category_code'], name: 'idx_seeker_profile_job_category_code' },
            { fields: ['state_code'], name: 'idx_seeker_profile_state_code' },
            { fields: ['city_code'], name: 'idx_seeker_profile_city_code' },
            { fields: ['status'], name: 'idx_seeker_profile_status' }
        ]
    });

    return SeekerProfile;
};
