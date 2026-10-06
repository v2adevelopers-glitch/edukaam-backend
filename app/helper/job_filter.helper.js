const { Op } = require('sequelize');
const { JOB_STATUS } = require('../constants/job.constant');

// Jobs anyone may see as an opening: live, open and not taken down by the admin
exports.visibleOpeningWhere = () => ({
    deleted: false,
    status: 'active',
    job_status: JOB_STATUS.OPEN,
    taken_down_at: null
});

// Filters shared by the seeker openings and the public job list (adds to whereCondition)
exports.applyOpeningFilters = (whereCondition, { search, institution_type_code, job_type, state_code, city_code }) => {
    if (institution_type_code) {
        whereCondition['$provider.providerProfile.institution_type_code$'] = institution_type_code;
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
        whereCondition[Op.or] = [
            { title: { [Op.like]: `%${search}%` } },
            { '$provider.providerProfile.institution_name$': { [Op.like]: `%${search}%` } }
        ];
    }
    return whereCondition;
};
