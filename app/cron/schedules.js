// minute hour day-of-month month day-of-week (an optional leading field is seconds)
module.exports = {
    EVERY_MINUTE: '* * * * *',
    EVERY_5_MINUTES: '*/5 * * * *',
    EVERY_15_MINUTES: '*/15 * * * *',
    EVERY_HOUR: '0 * * * *',
    DAILY_MIDNIGHT: '0 0 * * *',
    DAILY_0005AM: '5 0 * * *',
    DAILY_2AM: '0 2 * * *',
    WEEKLY_MONDAY_9AM: '0 9 * * 1',
    MONTHLY_FIRST: '0 0 1 * *',
};
