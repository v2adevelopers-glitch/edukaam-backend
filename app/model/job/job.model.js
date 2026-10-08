module.exports = (sequelize, DataTypes) => {
    const Job = sequelize.define("job", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        code: { type: DataTypes.STRING(20), allowNull: false },
        provider_user_code: { type: DataTypes.STRING(20), allowNull: false },      // FK: users.code
        job_category_code: { type: DataTypes.STRING(20), allowNull: false },       // FK: job_categories.code
        title: { type: DataTypes.STRING(200), allowNull: false },
        job_type: { type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'visiting'), allowNull: false, defaultValue: 'full_time' },
        vacancies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        hired_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        min_qualification: { type: DataTypes.STRING(150), allowNull: true },
        min_experience_years: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        salary_min: { type: DataTypes.DECIMAL(12, 2), allowNull: false },          // monthly, INR
        salary_max: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        state_code: { type: DataTypes.STRING(20), allowNull: false },              // FK: states.code
        city_code: { type: DataTypes.STRING(20), allowNull: false },               // FK: cities.code
        last_date: { type: DataTypes.DATEONLY, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        // hiring state; the audit status column below stays active/inactive
        job_status: { type: DataTypes.ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' },
        // admin moderation: a taken-down job is closed and can't be reopened by the provider
        taken_down_at: { type: DataTypes.DATE, allowNull: true },
        taken_down_by: { type: DataTypes.INTEGER, allowNull: true },
        takedown_reason: { type: DataTypes.STRING(500), allowNull: true },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "jobs",
        indexes: [
            { fields: ['code'], name: 'idx_job_code', unique: true },
            // a provider's jobs, newest first
            { fields: ['provider_user_code', 'deleted', 'created_at'], name: 'idx_job_provider_recent' },
            // seeker openings: category + visible, read newest first without a sort
            { fields: ['job_category_code', 'job_status', 'deleted', 'status', 'taken_down_at', 'created_at'], name: 'idx_job_category_open' },
            // public list: visible jobs newest first. Must end at created_at: InnoDB appends id, so
            // ORDER BY created_at, id is read from the index without a sort
            { fields: ['job_status', 'deleted', 'status', 'taken_down_at', 'created_at'], name: 'idx_job_open_recent' },
            { fields: ['job_type'], name: 'idx_job_job_type' },
            { fields: ['state_code'], name: 'idx_job_state_code' },
            { fields: ['city_code'], name: 'idx_job_city_code' },
            { fields: ['last_date'], name: 'idx_job_last_date' },
            // no single-column indexes on status / taken_down_at: nearly every row has the same value,
            // and the optimizer intersected them instead of using the composites above
        ]
    });

    return Job;
};
