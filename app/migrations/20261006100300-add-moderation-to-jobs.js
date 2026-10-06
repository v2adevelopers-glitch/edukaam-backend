'use strict';

const { addColumnsIfMissing, removeColumnsIfPresent, addIndexIfMissing, removeIndexIfPresent } = require('../helper/migration.helper');

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnsIfMissing(queryInterface, 'jobs', {
      taken_down_at: { type: Sequelize.DATE, allowNull: true, after: 'job_status' },
      taken_down_by: { type: Sequelize.INTEGER, allowNull: true, after: 'taken_down_at' },
      takedown_reason: { type: Sequelize.STRING(500), allowNull: true, after: 'taken_down_by' }
    });
    await addIndexIfMissing(queryInterface, 'jobs', ['taken_down_at'], 'idx_job_taken_down_at');
  },

  async down(queryInterface) {
    await removeIndexIfPresent(queryInterface, 'jobs', 'idx_job_taken_down_at');
    await removeColumnsIfPresent(queryInterface, 'jobs', ['takedown_reason', 'taken_down_by', 'taken_down_at']);
  }
};
