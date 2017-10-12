let config = {
    /* default break time, in minutes */
    defaultBreak: 5,
    /* max break time, in minutes */
    maxBreak: 120,
    /* how long to wait between reminders to log back in, in seconds */
    remindTime: 120,
    /* grace period after a chat ends, in seconds */
    wrapupTime: 45,
    /* how long to wait before expiring a lunch slot, in minutes */
    lunchExpire: 120,
    /* maximum number of breaks someone can take per day */
    maxDailyBreaks: 5,
    /* default maximum number of people on break at a time */
    maxOnBreak: 5,
    /* percentage of people punched in that can be on break */
    maxOnBreakPercentage: .1,
    /* minimum time required between two breaks, in minutes */
    breakCooldown: 60
};

module.exports = config;