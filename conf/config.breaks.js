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
    lunchExpire: 120
};

module.exports = config;