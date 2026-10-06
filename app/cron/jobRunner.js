// Wraps a job: skips a tick while the previous run is still going, logs duration and errors
class JobRunner {
    constructor(jobName) {
        this.jobName = jobName;
        this.isRunning = false;
    }

    async execute(jobFunction) {
        if (this.isRunning) {
            console.warn(`[CRON] Job ${this.jobName} is already running, skipping...`);
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            const result = await jobFunction();
            console.log(`[CRON] Job ${this.jobName} completed in ${Date.now() - startTime}ms`, result);
            return result;
        } catch (error) {
            console.error(`[CRON] Job ${this.jobName} failed after ${Date.now() - startTime}ms`, error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = JobRunner;
