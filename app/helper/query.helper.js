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

module.exports = { dateRangeWhere, toDateOnly, coversDay };
