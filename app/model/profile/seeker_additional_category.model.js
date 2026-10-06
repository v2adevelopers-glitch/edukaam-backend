module.exports = (sequelize, DataTypes) => {
    // Extra job categories a seeker wants openings from, besides seeker_profiles.job_category_code.
    // Removing one soft-deletes the row and adding it again revives it.
    const SeekerAdditionalCategory = sequelize.define("seeker_additional_category", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        seeker_user_code: { type: DataTypes.STRING(20), allowNull: false },        // FK: users.code
        job_category_code: { type: DataTypes.STRING(20), allowNull: false },       // FK: job_categories.code
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "seeker_additional_categories",
        indexes: [
            { fields: ['seeker_user_code', 'job_category_code'], name: 'idx_seeker_additional_category_seeker_category', unique: true },
            { fields: ['job_category_code'], name: 'idx_seeker_additional_category_job_category_code' }
        ]
    });

    return SeekerAdditionalCategory;
};
