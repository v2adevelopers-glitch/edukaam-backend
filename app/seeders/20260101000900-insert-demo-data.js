'use strict';

const bcrypt = require('bcrypt');
const { providers, seekers, jobs, applications } = require('../data/demo_data.json');

// Optional demo data: 6 providers, 20 seekers, 25 jobs and 45 applications. Runs only when
// SEED_DEMO_DATA=true. Every demo account uses SEED_DEMO_PASSWORD. Business codes continue
// from the highest existing code (computed in SQL; seeders never load app/model).

const PROVIDER_ROLE = 1002;
const SEEKER_ROLE = 1003;
const DAY_MS = 24 * 60 * 60 * 1000;

const demoEmails = [...providers, ...seekers].map(u => u.email);

const daysAgo = (days) => new Date(Date.now() - days * DAY_MS);

// 'YYYY-MM-DD' + n days, computed on the date string so no time zone can shift it
const addDays = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const audit = (createdAt) => ({
  status: 'active',
  created_at: createdAt,
  created_by: null,
  modified_at: createdAt,
  modified_by: null,
  ip_address: null,
  deleted: false
});

module.exports = {
  async up(queryInterface, Sequelize) {
    if (process.env.SEED_DEMO_DATA !== 'true') return;
    if (!process.env.SEED_DEMO_PASSWORD) throw new Error('Set SEED_DEMO_PASSWORD in .env first (or SEED_DEMO_DATA=false)');

    const { QueryTypes } = Sequelize;
    const select = (sql, replacements = {}) => queryInterface.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

    // the demo set is inserted as a whole; if any of it is already there, leave it alone
    const [present] = await select(`SELECT COUNT(*) AS count FROM users WHERE email IN (:emails) OR phone IN (:phones)`, {
      emails: demoEmails,
      phones: [...providers, ...seekers].map(u => u.phone)
    });
    if (Number(present.count) > 0) return;

    const nextSeq = async (table, prefix) => {
      const [row] = await select(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(code, :start) AS UNSIGNED)), 0) AS seq FROM ${table} WHERE code LIKE :pattern`,
        { start: prefix.length + 1, pattern: `${prefix}%` }
      );
      return Number(row.seq);
    };
    const codeAt = (prefix, seq) => prefix + String(seq).padStart(5, '0');

    const [{ today }] = await select(`SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today`);
    let userSeq = await nextSeq('users', 'EDJUSR');
    let jobSeq = await nextSeq('jobs', 'EDJJOB');
    let appSeq = await nextSeq('applications', 'EDJAPP');

    // ── users (one bcrypt hash each, so no two rows share a salt)
    const userCodes = {};
    const userRows = [];
    for (const [list, role_code] of [[providers, PROVIDER_ROLE], [seekers, SEEKER_ROLE]]) {
      for (const u of list) {
        userCodes[u.key] = codeAt('EDJUSR', ++userSeq);
        userRows.push({
          code: userCodes[u.key],
          role_code,
          name: u.name,
          phone: u.phone,
          email: u.email,
          password: await bcrypt.hash(process.env.SEED_DEMO_PASSWORD, 12),
          failed_login_attempts: 0,
          last_login: null,
          ...audit(daysAgo(60))
        });
      }
    }

    const providerRows = providers.map(p => ({
      user_code: userCodes[p.key],
      institution_name: p.name,
      institution_type_code: p.institution_type_code,
      contact_person: p.contact_person,
      designation: p.designation,
      established_year: p.established_year,
      website: p.website,
      about: p.about,
      address: p.address,
      state_code: p.state_code,
      city_code: p.city_code,
      pincode: p.pincode,
      ...audit(daysAgo(60))
    }));

    const seekerRows = seekers.map(s => ({
      user_code: userCodes[s.key],
      job_category_code: s.job_category_code,
      gender: s.gender,
      date_of_birth: s.date_of_birth,
      qualification: s.qualification,
      experience_years: s.experience_years,
      skills: s.skills,
      expected_salary: s.expected_salary,
      state_code: s.state_code,
      city_code: s.city_code,
      about: s.about,
      ...audit(daysAgo(60))
    }));

    // ── jobs: hired_count comes from the hired applications, and a job is closed when it is
    // filled, past its last date, or marked closed in the data
    const jobCodes = {};
    const jobRows = jobs.map(j => {
      jobCodes[j.key] = codeAt('EDJJOB', ++jobSeq);
      const hired = applications.filter(a => a.job === j.key && a.application_status === 'hired').length;
      const lastDate = addDays(today, j.last_date_offset_days);
      const closed = j.closed_manually || hired >= j.vacancies || lastDate < today;
      return {
        code: jobCodes[j.key],
        provider_user_code: userCodes[j.provider],
        job_category_code: j.job_category_code,
        title: j.title,
        job_type: j.job_type,
        vacancies: j.vacancies,
        hired_count: hired,
        min_qualification: j.min_qualification,
        min_experience_years: j.min_experience_years,
        salary_min: j.salary_min,
        salary_max: j.salary_max,
        state_code: j.state_code,
        city_code: j.city_code,
        last_date: lastDate,
        description: j.description,
        job_status: closed ? 'closed' : 'open',
        ...audit(daysAgo(j.created_days_ago))
      };
    });

    const applicationRows = applications.map(a => {
      const appliedAt = daysAgo(a.applied_days_ago);
      const changedAt = a.status_changed_days_ago === null ? null : daysAgo(a.status_changed_days_ago);
      return {
        code: codeAt('EDJAPP', ++appSeq),
        job_code: jobCodes[a.job],
        seeker_user_code: userCodes[a.seeker],
        application_status: a.application_status,
        applied_at: appliedAt,
        status_changed_at: changedAt,
        ...audit(appliedAt),
        modified_at: changedAt || appliedAt
      };
    });

    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.bulkInsert('users', userRows, { transaction });
      await queryInterface.bulkInsert('provider_profiles', providerRows, { transaction });
      await queryInterface.bulkInsert('seeker_profiles', seekerRows, { transaction });
      await queryInterface.bulkInsert('jobs', jobRows, { transaction });
      await queryInterface.bulkInsert('applications', applicationRows, { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  // Removes the demo accounts and everything that hangs off them (children first)
  async down(queryInterface, Sequelize) {
    const { QueryTypes } = Sequelize;
    const users = await queryInterface.sequelize.query(`SELECT code FROM users WHERE email IN (:emails)`, {
      replacements: { emails: demoEmails },
      type: QueryTypes.SELECT
    });
    const codes = users.map(u => u.code);
    if (!codes.length) return;

    const run = (sql) => queryInterface.sequelize.query(sql, { replacements: { codes }, type: QueryTypes.DELETE });
    await run(`DELETE FROM applications WHERE seeker_user_code IN (:codes)
               OR job_code IN (SELECT code FROM (SELECT code FROM jobs WHERE provider_user_code IN (:codes)) AS demo_jobs)`);
    await run(`DELETE FROM jobs WHERE provider_user_code IN (:codes)`);
    await run(`DELETE FROM provider_profiles WHERE user_code IN (:codes)`);
    await run(`DELETE FROM seeker_profiles WHERE user_code IN (:codes)`);
    await run(`DELETE FROM users WHERE code IN (:codes)`);
  }
};
