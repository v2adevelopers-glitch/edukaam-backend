'use strict';

const { addColumnsIfMissing, removeColumnsIfPresent } = require('../helper/migration.helper');

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnsIfMissing(queryInterface, 'users', {
      token_version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, after: 'last_login' },
      email_verified_at: { type: Sequelize.DATE, allowNull: true, after: 'token_version' },
      phone_verified_at: { type: Sequelize.DATE, allowNull: true, after: 'email_verified_at' }
    });
  },

  async down(queryInterface) {
    await removeColumnsIfPresent(queryInterface, 'users', ['phone_verified_at', 'email_verified_at', 'token_version']);
  }
};
