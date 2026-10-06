'use strict';

const rows = require('../data/cities.json');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // code is unique, and so is the name within a state; skip rows that already exist
    const existing = await queryInterface.sequelize.query(`SELECT code, name, state_code FROM cities`, { type: Sequelize.QueryTypes.SELECT });
    const existingCodes = new Set(existing.map(r => r.code));
    const existingNames = new Set(existing.map(r => `${r.state_code}:${r.name}`));

    const toInsert = rows
      .filter(r => !existingCodes.has(r.code) && !existingNames.has(`${r.state_code}:${r.name}`))
      .map(r => ({ code: r.code, name: r.name, state_code: r.state_code, status: 'active', created_at: now, modified_at: now, deleted: false }));

    if (toInsert.length) await queryInterface.bulkInsert('cities', toInsert);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('cities', { code: rows.map(r => r.code) });
  }
};
