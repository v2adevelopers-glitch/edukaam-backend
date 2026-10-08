'use strict';

const { addIndexIfMissing, removeIndexIfPresent } = require('../helper/migration.helper');

// Composite indexes matching how lists filter and order (measured on 30k jobs / 300k
// applications: openings and the public list went from a filesort of every open job to an
// ordered index read). Each new index starts with the
// column of the single-column index it replaces, so foreign keys keep an index throughout:
// add first, then drop.
const added = [
  ['jobs', ['provider_user_code', 'deleted', 'created_at'], 'idx_job_provider_recent'],
  ['jobs', ['job_category_code', 'job_status', 'deleted', 'status', 'taken_down_at', 'created_at'], 'idx_job_category_open'],
  ['jobs', ['job_status', 'deleted', 'status', 'taken_down_at', 'created_at'], 'idx_job_open_recent'],
  ['applications', ['job_code', 'deleted', 'application_status'], 'idx_application_job_live'],
  ['applications', ['seeker_user_code', 'deleted', 'applied_at'], 'idx_application_seeker_recent'],
  ['applications', ['deleted', 'application_status'], 'idx_application_live_status']
];

const replaced = [
  ['jobs', ['provider_user_code'], 'idx_job_provider_user_code'],
  ['jobs', ['job_category_code'], 'idx_job_job_category_code'],
  ['jobs', ['job_status'], 'idx_job_job_status'],
  // near-constant columns: they misled the optimizer into index-merge plans
  ['jobs', ['status'], 'idx_job_status'],
  ['jobs', ['taken_down_at'], 'idx_job_taken_down_at'],
  ['applications', ['job_code'], 'idx_application_job_code'],
  ['applications', ['seeker_user_code'], 'idx_application_seeker_user_code']
];

module.exports = {
  async up(queryInterface) {
    for (const [table, fields, name] of added) await addIndexIfMissing(queryInterface, table, fields, name);
    for (const [table, , name] of replaced) await removeIndexIfPresent(queryInterface, table, name);
  },

  async down(queryInterface) {
    for (const [table, fields, name] of replaced) await addIndexIfMissing(queryInterface, table, fields, name);
    for (const [table, , name] of added) await removeIndexIfPresent(queryInterface, table, name);
  }
};
