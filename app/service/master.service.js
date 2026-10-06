const { Op } = require('sequelize');
const db = require('../model');
const codeGenerator = require('../helper/code_generator.helper');

// The four master tables share one shape (code, name, audit block; cities add state_code),
// so the queries below go through these private helpers. Every exported function is still
// named after the table it serves.

const MASTER_ATTRIBUTES = ['code', 'name', 'status'];
const stateInclude = { model: db.state, as: 'state', attributes: ['code', 'name'] };

const formatMaster = (row) => {
    if (!row) return null;
    return { code: row.code, name: row.name, status: row.status };
};

const formatCity = (row) => {
    if (!row) return null;
    return {
        code: row.code,
        name: row.name,
        state_code: row.state_code,
        state_name: row.state ? row.state.name : null,
        status: row.status
    };
};

const listMaster = async (model, whereCondition, page, limit, options = {}) => {
    const offset = (page - 1) * limit;
    const { count, rows } = await model.findAndCountAll({
        where: whereCondition,
        attributes: options.attributes || MASTER_ATTRIBUTES,
        include: options.include || [],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['name', 'ASC']],
        distinct: true
    });

    const format = options.format || formatMaster;
    return {
        data: rows.map(format),
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
        }
    };
};

const findMasterByCode = (model, code, options = {}) => model.findOne({
    where: { code, deleted: false, ...(options.activeOnly ? { status: 'active' } : {}) },
    attributes: options.attributes || MASTER_ATTRIBUTES,
    include: options.include || []
});

// Includes soft-deleted rows: names are unique across all rows (DB unique index)
const masterNameExists = async (model, whereCondition, excludeCode) => {
    const where = { ...whereCondition };
    if (excludeCode) where.code = { [Op.ne]: excludeCode };
    return !!(await model.findOne({ where, attributes: ['id'] }));
};

// Code generation and insert share a transaction so the generated code is the next free one
const createMaster = async (model, generateCode, columns, meta) => {
    const t = await db.sequelize.transaction();
    try {
        const code = await generateCode(t);
        await model.create({
            code,
            ...columns,
            deleted: false,
            created_at: new Date(),
            created_by: meta.userId || null,
            modified_at: new Date(),
            modified_by: null,
            ip_address: meta.ip || null
        }, { transaction: t });
        await t.commit();
        return code;
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const updateMaster = async (model, code, columns, meta) => {
    const [updated] = await model.update({
        ...columns,
        modified_at: new Date(),
        modified_by: meta.userId || null,
        ip_address: meta.ip || null
    }, { where: { code, deleted: false } });
    return !!updated;
};

const deleteMaster = async (model, code, meta) => {
    const [updated] = await model.update({
        deleted: true,
        status: 'inactive',
        modified_at: new Date(),
        modified_by: meta.userId || null,
        ip_address: meta.ip || null
    }, { where: { code, deleted: false } });
    return !!updated;
};

const countLive = (model, where) => model.count({ where: { ...where, deleted: false } });

// ─── Job categories ───────────────────────────────────────────────────────

exports.getJobCategories = async (whereCondition = { deleted: false }, page = 1, limit = 100) => {
    try {
        return await listMaster(db.jobCategory, whereCondition, page, limit);
    } catch (err) {
        throw err;
    }
};

exports.getJobCategoryByCode = async (code, activeOnly = false) => {
    try {
        return formatMaster(await findMasterByCode(db.jobCategory, code, { activeOnly }));
    } catch (err) {
        throw err;
    }
};

exports.jobCategoryNameExists = async (name, excludeCode = null) => {
    try {
        return await masterNameExists(db.jobCategory, { name }, excludeCode);
    } catch (err) {
        throw err;
    }
};

// Live jobs and seeker profiles that point at the category
exports.getJobCategoryUsageCount = async (code) => {
    try {
        const [jobs, seekers] = await Promise.all([
            countLive(db.job, { job_category_code: code }),
            countLive(db.seekerProfile, { job_category_code: code })
        ]);
        return jobs + seekers;
    } catch (err) {
        throw err;
    }
};

exports.createJobCategory = async (payload, meta = {}) => {
    try {
        const code = await createMaster(db.jobCategory, codeGenerator.generateJobCategoryCode, {
            name: payload.name,
            status: payload.status || 'active'
        }, meta);
        return await exports.getJobCategoryByCode(code);
    } catch (err) {
        throw err;
    }
};

exports.updateJobCategory = async (code, payload, meta = {}) => {
    try {
        const updated = await updateMaster(db.jobCategory, code, { name: payload.name, status: payload.status }, meta);
        if (!updated) return null;
        return await exports.getJobCategoryByCode(code);
    } catch (err) {
        throw err;
    }
};

exports.deleteJobCategory = async (code, meta = {}) => {
    try {
        return await deleteMaster(db.jobCategory, code, meta);
    } catch (err) {
        throw err;
    }
};

// ─── Institution types ────────────────────────────────────────────────────

exports.getInstitutionTypes = async (whereCondition = { deleted: false }, page = 1, limit = 100) => {
    try {
        return await listMaster(db.institutionType, whereCondition, page, limit);
    } catch (err) {
        throw err;
    }
};

exports.getInstitutionTypeByCode = async (code, activeOnly = false) => {
    try {
        return formatMaster(await findMasterByCode(db.institutionType, code, { activeOnly }));
    } catch (err) {
        throw err;
    }
};

exports.institutionTypeNameExists = async (name, excludeCode = null) => {
    try {
        return await masterNameExists(db.institutionType, { name }, excludeCode);
    } catch (err) {
        throw err;
    }
};

exports.getInstitutionTypeUsageCount = async (code) => {
    try {
        return await countLive(db.providerProfile, { institution_type_code: code });
    } catch (err) {
        throw err;
    }
};

exports.createInstitutionType = async (payload, meta = {}) => {
    try {
        const code = await createMaster(db.institutionType, codeGenerator.generateInstitutionTypeCode, {
            name: payload.name,
            status: payload.status || 'active'
        }, meta);
        return await exports.getInstitutionTypeByCode(code);
    } catch (err) {
        throw err;
    }
};

exports.updateInstitutionType = async (code, payload, meta = {}) => {
    try {
        const updated = await updateMaster(db.institutionType, code, { name: payload.name, status: payload.status }, meta);
        if (!updated) return null;
        return await exports.getInstitutionTypeByCode(code);
    } catch (err) {
        throw err;
    }
};

exports.deleteInstitutionType = async (code, meta = {}) => {
    try {
        return await deleteMaster(db.institutionType, code, meta);
    } catch (err) {
        throw err;
    }
};

// ─── States ───────────────────────────────────────────────────────────────

exports.getStates = async (whereCondition = { deleted: false }, page = 1, limit = 100) => {
    try {
        return await listMaster(db.state, whereCondition, page, limit);
    } catch (err) {
        throw err;
    }
};

exports.getStateByCode = async (code, activeOnly = false) => {
    try {
        return formatMaster(await findMasterByCode(db.state, code, { activeOnly }));
    } catch (err) {
        throw err;
    }
};

exports.stateNameExists = async (name, excludeCode = null) => {
    try {
        return await masterNameExists(db.state, { name }, excludeCode);
    } catch (err) {
        throw err;
    }
};

// Live cities, profiles and jobs in the state
exports.getStateUsageCount = async (code) => {
    try {
        const counts = await Promise.all([
            countLive(db.city, { state_code: code }),
            countLive(db.providerProfile, { state_code: code }),
            countLive(db.seekerProfile, { state_code: code }),
            countLive(db.job, { state_code: code })
        ]);
        return counts.reduce((sum, n) => sum + n, 0);
    } catch (err) {
        throw err;
    }
};

exports.createState = async (payload, meta = {}) => {
    try {
        const code = await createMaster(db.state, codeGenerator.generateStateCode, {
            name: payload.name,
            status: payload.status || 'active'
        }, meta);
        return await exports.getStateByCode(code);
    } catch (err) {
        throw err;
    }
};

exports.updateState = async (code, payload, meta = {}) => {
    try {
        const updated = await updateMaster(db.state, code, { name: payload.name, status: payload.status }, meta);
        if (!updated) return null;
        return await exports.getStateByCode(code);
    } catch (err) {
        throw err;
    }
};

exports.deleteState = async (code, meta = {}) => {
    try {
        return await deleteMaster(db.state, code, meta);
    } catch (err) {
        throw err;
    }
};

// ─── Cities ───────────────────────────────────────────────────────────────

const cityOptions = {
    attributes: ['code', 'name', 'state_code', 'status'],
    include: [stateInclude],
    format: formatCity
};

exports.getCities = async (whereCondition = { deleted: false }, page = 1, limit = 100) => {
    try {
        return await listMaster(db.city, whereCondition, page, limit, cityOptions);
    } catch (err) {
        throw err;
    }
};

exports.getCityByCode = async (code, activeOnly = false) => {
    try {
        return formatCity(await findMasterByCode(db.city, code, { ...cityOptions, activeOnly }));
    } catch (err) {
        throw err;
    }
};

// A city name is unique within its state
exports.cityNameExists = async (name, state_code, excludeCode = null) => {
    try {
        return await masterNameExists(db.city, { name, state_code }, excludeCode);
    } catch (err) {
        throw err;
    }
};

exports.getCityUsageCount = async (code) => {
    try {
        const counts = await Promise.all([
            countLive(db.providerProfile, { city_code: code }),
            countLive(db.seekerProfile, { city_code: code }),
            countLive(db.job, { city_code: code })
        ]);
        return counts.reduce((sum, n) => sum + n, 0);
    } catch (err) {
        throw err;
    }
};

exports.createCity = async (payload, meta = {}) => {
    try {
        const code = await createMaster(db.city, codeGenerator.generateCityCode, {
            name: payload.name,
            state_code: payload.state_code,
            status: payload.status || 'active'
        }, meta);
        return await exports.getCityByCode(code);
    } catch (err) {
        throw err;
    }
};

exports.updateCity = async (code, payload, meta = {}) => {
    try {
        const updated = await updateMaster(db.city, code, {
            name: payload.name,
            state_code: payload.state_code,
            status: payload.status
        }, meta);
        if (!updated) return null;
        return await exports.getCityByCode(code);
    } catch (err) {
        throw err;
    }
};

exports.deleteCity = async (code, meta = {}) => {
    try {
        return await deleteMaster(db.city, code, meta);
    } catch (err) {
        throw err;
    }
};
