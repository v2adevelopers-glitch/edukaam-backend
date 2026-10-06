const { literal } = require('sequelize');
const db = require('../model');
const { ROLE_CODES } = require('../constants/role.constant');

const nameOnly = ['code', 'name'];

// Only seekers who opted in (is_discoverable) are ever returned; contact details only when
// the caller says so (the seeker shares contact and the provider is verified)
const candidateIncludes = [
    {
        model: db.user,
        as: 'user',
        attributes: ['code', 'name', 'phone', 'email'],
        required: true,
        where: { role_code: ROLE_CODES.JOB_SEEKER, status: 'active', deleted: false }
    },
    { model: db.jobCategory, as: 'jobCategory', attributes: nameOnly },
    { model: db.state, as: 'state', attributes: nameOnly },
    { model: db.city, as: 'city', attributes: nameOnly }
];

const CANDIDATE_COLUMNS = ['user_code', 'job_category_code', 'gender', 'qualification', 'experience_years', 'skills',
    'expected_salary', 'state_code', 'city_code', 'about', 'resume_file', 'share_contact', 'modified_at'];

const additionalByUser = async (userCodes) => {
    if (!userCodes.length) return new Map();
    const rows = await db.seekerAdditionalCategory.findAll({
        where: { seeker_user_code: userCodes, deleted: false },
        include: [{ model: db.jobCategory, as: 'jobCategory', attributes: nameOnly }],
        order: [['id', 'ASC']]
    });
    const map = new Map();
    rows.forEach(r => {
        if (!map.has(r.seeker_user_code)) map.set(r.seeker_user_code, []);
        map.get(r.seeker_user_code).push({ code: r.job_category_code, name: r.jobCategory ? r.jobCategory.name : null });
    });
    return map;
};

const formatCandidate = (p, additional) => ({
    code: p.user_code,
    name: p.user.name,
    job_category_code: p.job_category_code,
    job_category_name: p.jobCategory ? p.jobCategory.name : null,
    additional_job_categories: additional || [],
    qualification: p.qualification,
    experience_years: p.experience_years,
    skills: p.skills,
    expected_salary: p.expected_salary,
    state_code: p.state_code,
    state_name: p.state ? p.state.name : null,
    city_code: p.city_code,
    city_name: p.city ? p.city.name : null,
    has_resume: !!p.resume_file,
    updated_at: p.modified_at
});

// whereCondition fragment: the seeker's primary or an additional category is `code`
exports.inCategoryWhere = (code) => {
    const escaped = db.sequelize.escape(code);
    return {
        [db.Sequelize.Op.or]: [
            { job_category_code: code },
            { user_code: { [db.Sequelize.Op.in]: literal(`(SELECT c.seeker_user_code FROM seeker_additional_categories AS c
                WHERE c.deleted = false AND c.job_category_code = ${escaped})`) } }
        ]
    };
};

exports.getCandidates = async (whereCondition, page = 1, limit = 10) => {
    try {
        const offset = (page - 1) * limit;
        const { count, rows } = await db.seekerProfile.findAndCountAll({
            where: whereCondition,
            attributes: CANDIDATE_COLUMNS,
            include: candidateIncludes,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['modified_at', 'DESC'], ['id', 'DESC']],
            distinct: true
        });
        const additional = await additionalByUser(rows.map(r => r.user_code));
        return {
            data: rows.map(r => formatCandidate(r, additional.get(r.user_code))),
            pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
        };
    } catch (err) {
        throw err;
    }
};

// Detail; { candidate, shares_contact } so the controller can decide on contact details
exports.getCandidate = async (whereCondition, revealContact) => {
    try {
        const row = await db.seekerProfile.findOne({ where: whereCondition, attributes: CANDIDATE_COLUMNS, include: candidateIncludes });
        if (!row) return null;
        const additional = await additionalByUser([row.user_code]);
        const candidate = { ...formatCandidate(row, additional.get(row.user_code)), gender: row.gender, about: row.about };

        const contactVisible = revealContact && row.share_contact;
        return {
            ...candidate,
            contact_visible: !!contactVisible,
            phone: contactVisible ? row.user.phone : null,
            email: contactVisible ? row.user.email : null,
            shares_contact: !!row.share_contact
        };
    } catch (err) {
        throw err;
    }
};
