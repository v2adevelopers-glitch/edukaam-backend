const rateLimitService = require('../../service/rate_limit.service');

// Deletes rate-limit counters whose window has ended
module.exports = async () => rateLimitService.purgeExpiredHits();
