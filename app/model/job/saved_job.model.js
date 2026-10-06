module.exports = (sequelize, DataTypes) => {
    // A seeker's bookmark. Unsaving soft-deletes the row and saving again revives it, so the
    // (seeker, job) pair stays unique across all rows.
    const SavedJob = sequelize.define("saved_job", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        seeker_user_code: { type: DataTypes.STRING(20), allowNull: false },        // FK: users.code
        job_code: { type: DataTypes.STRING(20), allowNull: false },                // FK: jobs.code
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "saved_jobs",
        indexes: [
            { fields: ['seeker_user_code', 'job_code'], name: 'idx_saved_job_seeker_job', unique: true },
            { fields: ['job_code'], name: 'idx_saved_job_job_code' }
        ]
    });

    return SavedJob;
};
