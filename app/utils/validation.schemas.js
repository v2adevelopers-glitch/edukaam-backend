const Joi = require('joi');
const { REGISTRABLE_ROLE_KEYS } = require('../constants/role.constant');
const { STORED_FILE_PATTERN } = require('../constants/file.constant');
const { JOB_TYPES, JOB_STATUS, APPLICATION_STATUSES, PROVIDER_SETTABLE_STATUSES, GENDERS } = require('../constants/job.constant');

// Common validation patterns
const commonPatterns = {
    id: Joi.number().integer().positive().required(),
    code: Joi.string().trim().required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    email: Joi.string().trim().lowercase().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().trim().pattern(/^[0-9]{10,15}$/),
    status: Joi.string().valid('active', 'inactive'),
    date: Joi.date().iso()
};

// Business codes (EDJJOB00001, EDJCAT00003, ...): upper-cased so lookups match the stored value
const businessCode = Joi.string().trim().uppercase().max(20);

// Indian mobile/landline without country code
const phone10 = Joi.string().trim().pattern(/^[0-9]{10}$/).messages({
    'string.pattern.base': '"phone" must be exactly 10 digits'
});

// bcrypt only reads the first 72 bytes, so longer passwords are refused rather than truncated
const strongPassword = Joi.string().min(8).max(72).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/).messages({
    'string.pattern.base': '"password" must contain an upper-case letter, a lower-case letter and a digit'
});

const otpCode = Joi.string().trim().pattern(/^[0-9]{6}$/).messages({
    'string.pattern.base': '"otp" must be the 6-digit code'
});

// Optional free text a user may clear: null or '' (stored as null)
const optionalText = (max) => Joi.string().trim().max(max).allow(null, '');

const salary = Joi.number().min(0).max(100000000).precision(2);

// ─── Users / auth ─────────────────────────────────────────────────────────

exports.userSchemas = {
    login: Joi.object({
        username: Joi.string().trim().lowercase().required(),   // email or phone
        password: Joi.string().required()
    }),

    changePassword: Joi.object({
        current_password: Joi.string().required(),
        new_password: strongPassword.required()
    }),

    // username is the email or the phone the code goes to
    forgotPassword: Joi.object({
        username: Joi.alternatives().try(Joi.string().trim().lowercase().email(), phone10).required()
    }),

    resetPassword: Joi.object({
        username: Joi.alternatives().try(Joi.string().trim().lowercase().email(), phone10).required(),
        otp: otpCode.required(),
        new_password: strongPassword.required()
    }),

    sendVerification: Joi.object({
        channel: Joi.string().valid('email', 'phone').required()
    }),

    confirmVerification: Joi.object({
        channel: Joi.string().valid('email', 'phone').required(),
        otp: otpCode.required()
    }),

    // admin: clear the failed-login lockout of an account
    unlockUser: Joi.object({
        username: Joi.string().trim().max(150).required()      // email, phone or user code
    }),

    // The category/type that doesn't belong to the chosen role is dropped, not rejected,
    // so a form that always posts both fields still works
    register: Joi.object({
        role_key: Joi.string().valid(...REGISTRABLE_ROLE_KEYS).required(),
        name: Joi.string().trim().min(2).max(150).required(),
        phone: phone10.required(),
        email: commonPatterns.email.max(150),
        password: strongPassword.required(),
        job_category_code: Joi.when('role_key', {
            is: 'job_seeker',
            then: businessCode.required(),
            otherwise: Joi.any().strip()
        }),
        institution_type_code: Joi.when('role_key', {
            is: 'job_provider',
            then: businessCode.required(),
            otherwise: Joi.any().strip()
        })
    })
};

// ─── RBAC ─────────────────────────────────────────────────────────────────

exports.rbacSchemas = {
    rolecode: Joi.object({
        rolecode: Joi.number().integer().positive().required()
    })
};

// ─── Master data ──────────────────────────────────────────────────────────

// Dropdowns load a whole list in one call, so masters allow a larger page than other lists.
// status defaults to active (what a dropdown needs); 'all' returns active and inactive rows.
const masterListQuery = {
    page: commonPatterns.page,
    limit: Joi.number().integer().min(1).max(500).default(100),
    search: Joi.string().trim().max(100).optional(),
    status: Joi.string().valid('active', 'inactive', 'all').default('active')
};

const createNamedMaster = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    status: commonPatterns.status.optional()
});

const updateNamedMaster = Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    status: commonPatterns.status.optional()
}).min(1);

exports.masterSchemas = {
    getMasters: Joi.object(masterListQuery),

    getCities: Joi.object({
        ...masterListQuery,
        state_code: businessCode.optional()
    }),

    categorycode: Joi.object({ categorycode: businessCode.required() }),
    typecode: Joi.object({ typecode: businessCode.required() }),
    statecode: Joi.object({ statecode: businessCode.required() }),
    citycode: Joi.object({ citycode: businessCode.required() }),

    createJobCategory: createNamedMaster,
    updateJobCategory: updateNamedMaster,
    createInstitutionType: createNamedMaster,
    updateInstitutionType: updateNamedMaster,
    createState: createNamedMaster,
    updateState: updateNamedMaster,

    createCity: Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        state_code: businessCode.required(),
        status: commonPatterns.status.optional()
    }),

    updateCity: Joi.object({
        name: Joi.string().trim().min(2).max(100).optional(),
        state_code: businessCode.optional(),
        status: commonPatterns.status.optional()
    }).min(1)
};

// ─── Profiles ─────────────────────────────────────────────────────────────

// name, phone and email live on users; the rest on the profile row
const accountFields = {
    name: Joi.string().trim().min(2).max(150).optional(),
    phone: phone10.optional(),
    email: Joi.string().trim().lowercase().email().max(150).optional()
};

exports.profileSchemas = {
    updateProviderProfile: Joi.object({
        ...accountFields,
        institution_name: Joi.string().trim().min(2).max(150).optional(),
        institution_type_code: businessCode.optional(),
        contact_person: optionalText(150).optional(),
        designation: optionalText(100).optional(),
        established_year: Joi.number().integer().min(1800).max(new Date().getFullYear()).allow(null).optional(),
        website: Joi.string().trim().max(255).uri({ scheme: ['http', 'https'] }).allow(null, '').optional(),
        about: optionalText(5000).optional(),
        address: optionalText(500).optional(),
        state_code: businessCode.allow(null).optional(),
        city_code: businessCode.allow(null).optional(),
        pincode: Joi.string().trim().pattern(/^[1-9][0-9]{5}$/).allow(null, '').optional()
            .messages({ 'string.pattern.base': '"pincode" must be a 6-digit Indian PIN code' })
    }).min(1),

    updateSeekerProfile: Joi.object({
        ...accountFields,
        job_category_code: businessCode.optional(),
        gender: Joi.string().valid(...GENDERS).allow(null).optional(),
        date_of_birth: commonPatterns.date.min('1940-01-01').max('now').allow(null).optional(),
        qualification: optionalText(150).optional(),
        experience_years: Joi.number().integer().min(0).max(60).allow(null).optional(),
        skills: optionalText(1000).optional(),
        expected_salary: salary.allow(null).optional(),
        state_code: businessCode.allow(null).optional(),
        city_code: businessCode.allow(null).optional(),
        about: optionalText(5000).optional()
    }).min(1)
};

// ─── Jobs ─────────────────────────────────────────────────────────────────

exports.jobSchemas = {
    getJobs: Joi.object({
        page: commonPatterns.page,
        limit: commonPatterns.limit,
        search: Joi.string().trim().max(100).optional(),
        job_category_code: businessCode.optional(),
        job_type: Joi.string().valid(...JOB_TYPES).optional(),
        job_status: Joi.string().valid(...Object.values(JOB_STATUS)).optional()
    }),

    jobid: Joi.object({
        jobid: businessCode.required()
    }),

    createJob: Joi.object({
        job_category_code: businessCode.required(),
        title: Joi.string().trim().min(3).max(200).required(),
        job_type: Joi.string().valid(...JOB_TYPES).required(),
        vacancies: Joi.number().integer().min(1).max(1000).required(),
        min_qualification: optionalText(150).optional(),
        min_experience_years: Joi.number().integer().min(0).max(50).default(0),
        salary_min: salary.required(),
        salary_max: salary.required(),
        state_code: businessCode.required(),
        city_code: businessCode.required(),
        last_date: commonPatterns.date.required(),
        description: optionalText(10000).optional()
    }),

    // every field optional, at least one required
    updateJob: Joi.object({
        job_category_code: businessCode.optional(),
        title: Joi.string().trim().min(3).max(200).optional(),
        job_type: Joi.string().valid(...JOB_TYPES).optional(),
        vacancies: Joi.number().integer().min(1).max(1000).optional(),
        min_qualification: optionalText(150).optional(),
        min_experience_years: Joi.number().integer().min(0).max(50).optional(),
        salary_min: salary.optional(),
        salary_max: salary.optional(),
        state_code: businessCode.optional(),
        city_code: businessCode.optional(),
        last_date: commonPatterns.date.optional(),
        description: optionalText(10000).optional(),
        job_status: Joi.string().valid(...Object.values(JOB_STATUS)).optional()
    }).min(1),

    // The seeker's category always comes from their profile, so it is not a filter here
    getOpenings: Joi.object({
        page: commonPatterns.page,
        limit: commonPatterns.limit,
        search: Joi.string().trim().max(100).optional(),
        institution_type_code: businessCode.optional(),
        job_type: Joi.string().valid(...JOB_TYPES).optional(),
        state_code: businessCode.optional(),
        city_code: businessCode.optional()
    })
};

// ─── Applications ─────────────────────────────────────────────────────────

exports.applicationSchemas = {
    getApplications: Joi.object({
        page: commonPatterns.page,
        limit: commonPatterns.limit,
        search: Joi.string().trim().max(100).optional(),
        job_code: businessCode.optional(),
        application_status: Joi.string().valid(...APPLICATION_STATUSES).optional(),
        job_category_code: businessCode.optional()
    }),

    applicationid: Joi.object({
        applicationid: businessCode.required()
    }),

    updateApplicationStatus: Joi.object({
        application_status: Joi.string().valid(...PROVIDER_SETTABLE_STATUSES).required()
    }),

    getMyApplications: Joi.object({
        page: commonPatterns.page,
        limit: commonPatterns.limit,
        search: Joi.string().trim().max(100).optional(),
        application_status: Joi.string().valid(...APPLICATION_STATUSES).optional()
    }),

    createApplication: Joi.object({
        job_code: businessCode.required()
    })
};

// ─── Public ───────────────────────────────────────────────────────────────

exports.publicSchemas = {
    filename: Joi.object({
        filename: Joi.string().pattern(STORED_FILE_PATTERN).required()
    })
};
