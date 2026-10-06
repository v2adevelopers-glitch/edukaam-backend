const cron = require('node-cron');
const schedules = require('./schedules');
const JobRunner = require('./jobRunner');

const closeExpiredJobs = require('./jobs/closeExpiredJobs');

class CronScheduler {
    constructor() {
        this.jobs = [];
        this.isInitialized = false;
    }

    register(name, schedule, jobFunction, options = {}) {
        const jobRunner = new JobRunner(name);

        // createTask, not schedule: in node-cron v4 schedule() starts the task immediately,
        // so `enabled: false` could not keep a job from running
        const task = cron.createTask(schedule, async () => {
            await jobRunner.execute(jobFunction);
        }, { name, timezone: options.timezone || 'Asia/Kolkata' });

        this.jobs.push({ name, schedule, task, jobFunction, jobRunner, enabled: options.enabled !== false });
    }

    init() {
        if (this.isInitialized) return;

        // just after midnight IST, so jobs whose last date was yesterday close first thing
        this.register('close-expired-jobs', schedules.DAILY_0005AM, closeExpiredJobs, { enabled: true });

        this.isInitialized = true;
    }

    start() {
        this.init();
        this.jobs.filter(job => job.enabled).forEach(job => {
            job.task.start();
            console.log(`[CRON] Started job: ${job.name}`);
        });
    }

    stop() {
        this.jobs.forEach(job => job.task.stop());
    }

    async runJob(jobName) {
        this.init();
        const job = this.jobs.find(j => j.name === jobName);
        if (!job) throw new Error(`Job ${jobName} not found`);
        return job.jobRunner.execute(job.jobFunction);
    }
}

module.exports = new CronScheduler();
