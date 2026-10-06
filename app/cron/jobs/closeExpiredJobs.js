const jobService = require('../../service/job.service');

// Closes open jobs whose last_date is before today (DB date)
module.exports = async () => jobService.closeExpiredJobs();
