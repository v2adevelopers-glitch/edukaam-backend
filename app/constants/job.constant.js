exports.JOB_TYPES = ['full_time', 'part_time', 'contract', 'visiting'];

// jobs.job_status: separate from the audit status column (active/inactive)
exports.JOB_STATUS = {
    OPEN: 'open',
    CLOSED: 'closed'
};

// applications.application_status
exports.APPLICATION_STATUS = {
    APPLIED: 'applied',
    SHORTLISTED: 'shortlisted',
    INTERVIEW: 'interview',
    HIRED: 'hired',
    REJECTED: 'rejected'
};

// Display order for dashboards (zero-filled)
exports.APPLICATION_STATUSES = Object.values(exports.APPLICATION_STATUS);

// A provider moves an application forward from 'applied'; it never goes back to 'applied'
// (that would let the seeker withdraw an application the provider already acted on)
exports.PROVIDER_SETTABLE_STATUSES = [
    exports.APPLICATION_STATUS.SHORTLISTED,
    exports.APPLICATION_STATUS.INTERVIEW,
    exports.APPLICATION_STATUS.HIRED,
    exports.APPLICATION_STATUS.REJECTED
];

exports.GENDERS = ['male', 'female', 'other'];

// Seeker profile fields a provider needs to judge an application
exports.SEEKER_FIELDS_REQUIRED_TO_APPLY = ['job_category_code', 'qualification', 'experience_years'];
