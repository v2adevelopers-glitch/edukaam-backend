const { Op } = require('sequelize');

// created_at between from and to (whole days, either end optional); null when neither is given
const dateRangeWhere = (from, to) => {
    if (from && to) return { [Op.between]: [new Date(from), new Date(`${to}T23:59:59`)] };
    if (from) return { [Op.gte]: new Date(from) };
    if (to) return { [Op.lte]: new Date(`${to}T23:59:59`) };
    return null;
};

// Joi turns dates into Date objects (UTC midnight); DATEONLY columns get 'YYYY-MM-DD' so the
// server timezone can't shift them a day
const toDateOnly = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : (value || null));

// Conditions for a row whose fromField..toField window (either end may be null = open) covers day
const coversDay = (day, fromField = 'effective_from', toField = 'effective_to') => ([
    { [Op.or]: [{ [fromField]: null }, { [fromField]: { [Op.lte]: day } }] },
    { [Op.or]: [{ [toField]: null }, { [toField]: { [Op.gte]: day } }] }
]);

// True when a where object (Op.and / Op.or nests included) filters on an include's column
// ('$alias.column$'), so a count can leave out the joins nothing filters on
const referencesAlias = (where, alias) => {
    if (!where || typeof where !== 'object') return false;
    if (Array.isArray(where)) return where.some(w => referencesAlias(w, alias));
    return Object.keys(where).some(k => k.startsWith(`$${alias}.`))
        || [...Object.keys(where), ...Object.getOwnPropertySymbols(where)].some(k => referencesAlias(where[k], alias));
};

// Includes a count needs: required (inner) joins and joins the where clause filters on. An
// optional to-one join that nothing filters on can't change a count, so it is left out.
const countIncludes = (model, includes, where, path = '') => (includes || [])
    .filter(inc => inc.required || inc.where || referencesAlias(where, path + inc.as))
    .map(inc => ({
        model: inc.model,
        as: inc.as,
        attributes: [],
        required: inc.required,
        where: inc.where,
        include: countIncludes(inc.model, inc.include, where, `${path}${inc.as}.`)
    }));

const hasMultiJoin = (model, includes) => (includes || []).some(inc =>
    (model.associations[inc.as] && model.associations[inc.as].isMultiAssociation) || hasMultiJoin(inc.model, inc.include));

// findAndCountAll replacement in two steps. (1) In parallel: the count, and the page's ids sorted
// and cut with only the joins that filter (narrow rows, so the sort is cheap); (2) those rows with
// every include. One combined query joined and sorted every matching row before keeping a page.
// options.order must use the model's own columns. Returns { count, rows } in page order.
const findPage = async (model, options, page, limit) => {
    const include = countIncludes(model, options.include, options.where);
    const multi = hasMultiJoin(model, include);
    const [count, idRows] = await Promise.all([
        model.count({ where: options.where, include, ...(multi ? { distinct: true, col: 'id' } : {}) }),
        model.findAll({
            where: options.where,
            include,
            attributes: ['id'],
            order: options.order,
            limit: parseInt(limit),
            offset: (page - 1) * limit,
            raw: true,
            ...(multi ? { group: [`${model.name}.id`] } : {})
        })
    ]);

    const ids = idRows.map(r => r.id);
    if (!ids.length) return { count, rows: [] };

    const attributes = options.attributes ? ['id', ...options.attributes.filter(a => a !== 'id')] : undefined;
    const rows = await model.findAll({ ...options, attributes, where: { id: ids } });
    const byId = new Map(rows.map(r => [r.id, r]));
    return { count, rows: ids.map(id => byId.get(id)).filter(Boolean) };
};

module.exports = { dateRangeWhere, toDateOnly, coversDay, referencesAlias, findPage };
