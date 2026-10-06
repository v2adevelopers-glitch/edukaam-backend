'use strict';

const { addColumnsIfMissing, removeColumnsIfPresent } = require('../helper/migration.helper');

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnsIfMissing(queryInterface, 'provider_profiles', {
      logo_file: { type: Sequelize.STRING(255), allowNull: true, after: 'pincode' },
      verified_at: { type: Sequelize.DATE, allowNull: true, after: 'logo_file' },
      verified_by: { type: Sequelize.INTEGER, allowNull: true, after: 'verified_at' }
    });
  },

  async down(queryInterface) {
    await removeColumnsIfPresent(queryInterface, 'provider_profiles', ['verified_by', 'verified_at', 'logo_file']);
  }
};
