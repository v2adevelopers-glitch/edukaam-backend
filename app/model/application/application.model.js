module.exports = (sequelize, DataTypes) => {
    const Application = sequelize.define("application", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        code: { type: DataTypes.STRING(20), allowNull: false },
        job_code: { type: DataTypes.STRING(20), allowNull: false },                // FK: jobs.code
        seeker_user_code: { type: DataTypes.STRING(20), allowNull: false },        // FK: users.code
        application_status: {
            type: DataTypes.ENUM('applied', 'shortlisted', 'interview', 'hired', 'rejected'),
            allowNull: false,
            defaultValue: 'applied'
        },
        applied_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        status_changed_at: { type: DataTypes.DATE, allowNull: true },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "applications",
        indexes: [
            { fields: ['code'], name: 'idx_application_code', unique: true },
            { fields: ['job_code'], name: 'idx_application_job_code' },
            { fields: ['seeker_user_code'], name: 'idx_application_seeker_user_code' },
            // not unique: a withdrawn (soft-deleted) application must not block a new one.
            // "one live application per job and seeker" is enforced in the apply transaction.
            { fields: ['job_code', 'seeker_user_code'], name: 'idx_application_job_seeker' },
            { fields: ['application_status'], name: 'idx_application_application_status' },
            { fields: ['status'], name: 'idx_application_status' }
        ]
    });

    return Application;
};
