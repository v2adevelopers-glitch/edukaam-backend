const { Op, literal } = require('sequelize');
const db = require('../model');
const { JOB_STATUS } = require('../constants/job.constant');

// Jobs anyone may see as an opening: live, open and not taken down by the admin
exports.visibleOpeningWhere = () => ({
    deleted: false,
    status: 'active',
    job_status: JOB_STATUS.OPEN,
    taken_down_at: null
});

// Institution filters as "provider_user_code IN (matching profiles)" rather than a join: with a
// join the optimizer read provider_profiles first and sorted every match, instead of reading
// jobs newest-first from the index and stopping at the page size.
const providersWhere = (condition) =>
    ({ provider_user_code: { [Op.in]: literal(`(SELECT user_code FROM provider_profiles WHERE ${condition})`) } });

// Filters shared by the seeker openings and the public job list (adds to whereCondition)
exports.applyOpeningFilters = (whereCondition, { search, institution_type_code, job_type, state_code, city_code }) => {
    const conditions = [];

    if (institution_type_code) {
        conditions.push(providersWhere(`institution_type_code = ${db.sequelize.escape(institution_type_code)}`));
    }
    if (job_type) {
        whereCondition.job_type = job_type;
    }
    if (state_code) {
        whereCondition.state_code = state_code;
    }
    if (city_code) {
        whereCondition.city_code = city_code;
    }
    if (search) {
        const pattern = db.sequelize.escape(`%${search}%`);
        conditions.push({
            [Op.or]: [
                { title: { [Op.like]: `%${search}%` } },
                providersWhere(`institution_name LIKE ${pattern}`)
            ]
        });
    }
    if (conditions.length) {
        whereCondition[Op.and] = conditions;
    }
    return whereCondition;
};
