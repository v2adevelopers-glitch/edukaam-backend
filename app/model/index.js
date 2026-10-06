const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    logging: false, // set to console.log to see the SQL
    // Session time zone: CURDATE() (job expiry, "today") must be the Indian date, not UTC
    timezone: process.env.DB_TIMEZONE || '+05:30',
    // DECIMAL columns (salaries) come back as numbers instead of strings
    dialectOptions: { connectTimeout: 60000, decimalNumbers: true }
});

sequelize.authenticate()
    .then(() => console.log("Database Connection Success [✓]"))
    .catch((err) => console.log("Error Connecting Database [X]", err));

const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// ─── Models ───────────────────────────────────────────────────────────────
db.role = require('./role/role.model')(sequelize, DataTypes);
db.user = require('./user/user.model')(sequelize, DataTypes);
db.module = require('./modules/module.model')(sequelize, DataTypes);
db.menu = require('./menu/menu.model')(sequelize, DataTypes);
db.roleModuleAccessMapping = require('./modules/role_module_access_mapping.model')(sequelize, DataTypes);
db.apiModuleMapping = require('./modules/api_module_mapping.model')(sequelize, DataTypes);

db.jobCategory = require('./master/job_category.model')(sequelize, DataTypes);
db.institutionType = require('./master/institution_type.model')(sequelize, DataTypes);
db.state = require('./master/state.model')(sequelize, DataTypes);
db.city = require('./master/city.model')(sequelize, DataTypes);

db.providerProfile = require('./profile/provider_profile.model')(sequelize, DataTypes);
db.seekerProfile = require('./profile/seeker_profile.model')(sequelize, DataTypes);

db.job = require('./job/job.model')(sequelize, DataTypes);
db.application = require('./application/application.model')(sequelize, DataTypes);

// ─── Associations ─────────────────────────────────────────────────────────
// Foreign keys are created here only (never `references:` in a model). Always give `as`,
// onDelete and onUpdate, and use the same values on both sides of a pair.

// User -> Role by code (a role can't be deleted while users have it)
db.user.belongsTo(db.role, { foreignKey: 'role_code', targetKey: 'code', as: 'role', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.role.hasMany(db.user, { foreignKey: 'role_code', sourceKey: 'code', as: 'users', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });

// Role-module access rows belong to their role and module
db.roleModuleAccessMapping.belongsTo(db.role, { foreignKey: 'role_code', targetKey: 'code', as: 'role', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.role.hasMany(db.roleModuleAccessMapping, { foreignKey: 'role_code', sourceKey: 'code', as: 'moduleAccess', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.roleModuleAccessMapping.belongsTo(db.module, { foreignKey: 'module_id', as: 'module', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.module.hasMany(db.roleModuleAccessMapping, { foreignKey: 'module_id', as: 'roleAccess', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// API endpoint -> module
db.apiModuleMapping.belongsTo(db.module, { foreignKey: 'module_id', as: 'module', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.module.hasMany(db.apiModuleMapping, { foreignKey: 'module_id', as: 'apis', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// Menu -> module, and the menu tree
db.menu.belongsTo(db.module, { foreignKey: 'module_id', as: 'module', onDelete: 'NO ACTION', onUpdate: 'NO ACTION' });
db.module.hasMany(db.menu, { foreignKey: 'module_id', as: 'menus', onDelete: 'NO ACTION', onUpdate: 'NO ACTION' });
db.menu.belongsTo(db.menu, { foreignKey: 'parent_id', as: 'parent', onDelete: 'SET NULL', onUpdate: 'NO ACTION' });
db.menu.hasMany(db.menu, { foreignKey: 'parent_id', as: 'children', onDelete: 'SET NULL', onUpdate: 'NO ACTION' });

// City -> State by code (a state can't be deleted while it has cities)
db.city.belongsTo(db.state, { foreignKey: 'state_code', targetKey: 'code', as: 'state', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.state.hasMany(db.city, { foreignKey: 'state_code', sourceKey: 'code', as: 'cities', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });

// Provider profile: owned by its user, references masters by code
db.providerProfile.belongsTo(db.user, { foreignKey: 'user_code', targetKey: 'code', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.user.hasOne(db.providerProfile, { foreignKey: 'user_code', sourceKey: 'code', as: 'providerProfile', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.providerProfile.belongsTo(db.institutionType, { foreignKey: 'institution_type_code', targetKey: 'code', as: 'institutionType', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.institutionType.hasMany(db.providerProfile, { foreignKey: 'institution_type_code', sourceKey: 'code', as: 'providerProfiles', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.providerProfile.belongsTo(db.state, { foreignKey: 'state_code', targetKey: 'code', as: 'state', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.state.hasMany(db.providerProfile, { foreignKey: 'state_code', sourceKey: 'code', as: 'providerProfiles', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.providerProfile.belongsTo(db.city, { foreignKey: 'city_code', targetKey: 'code', as: 'city', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.city.hasMany(db.providerProfile, { foreignKey: 'city_code', sourceKey: 'code', as: 'providerProfiles', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });

// Seeker profile: owned by its user, references masters by code
db.seekerProfile.belongsTo(db.user, { foreignKey: 'user_code', targetKey: 'code', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.user.hasOne(db.seekerProfile, { foreignKey: 'user_code', sourceKey: 'code', as: 'seekerProfile', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.seekerProfile.belongsTo(db.jobCategory, { foreignKey: 'job_category_code', targetKey: 'code', as: 'jobCategory', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.jobCategory.hasMany(db.seekerProfile, { foreignKey: 'job_category_code', sourceKey: 'code', as: 'seekerProfiles', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.seekerProfile.belongsTo(db.state, { foreignKey: 'state_code', targetKey: 'code', as: 'state', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.state.hasMany(db.seekerProfile, { foreignKey: 'state_code', sourceKey: 'code', as: 'seekerProfiles', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.seekerProfile.belongsTo(db.city, { foreignKey: 'city_code', targetKey: 'code', as: 'city', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.city.hasMany(db.seekerProfile, { foreignKey: 'city_code', sourceKey: 'code', as: 'seekerProfiles', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });

// Job: owned by its provider user, references masters by code
db.job.belongsTo(db.user, { foreignKey: 'provider_user_code', targetKey: 'code', as: 'provider', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.user.hasMany(db.job, { foreignKey: 'provider_user_code', sourceKey: 'code', as: 'jobs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.job.belongsTo(db.jobCategory, { foreignKey: 'job_category_code', targetKey: 'code', as: 'jobCategory', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.jobCategory.hasMany(db.job, { foreignKey: 'job_category_code', sourceKey: 'code', as: 'jobs', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.job.belongsTo(db.state, { foreignKey: 'state_code', targetKey: 'code', as: 'state', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.state.hasMany(db.job, { foreignKey: 'state_code', sourceKey: 'code', as: 'jobs', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.job.belongsTo(db.city, { foreignKey: 'city_code', targetKey: 'code', as: 'city', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.city.hasMany(db.job, { foreignKey: 'city_code', sourceKey: 'code', as: 'jobs', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });

// Application: owned by its job and by its seeker user
db.application.belongsTo(db.job, { foreignKey: 'job_code', targetKey: 'code', as: 'job', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.job.hasMany(db.application, { foreignKey: 'job_code', sourceKey: 'code', as: 'applications', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.application.belongsTo(db.user, { foreignKey: 'seeker_user_code', targetKey: 'code', as: 'seeker', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.user.hasMany(db.application, { foreignKey: 'seeker_user_code', sourceKey: 'code', as: 'applications', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// Creates missing tables only; it never changes existing ones (use migrations for that).
// NEVER use force: true: it drops and recreates every table in every process that loads this file.
db.sequelize.sync({ force: false });

module.exports = db;
