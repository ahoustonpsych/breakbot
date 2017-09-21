// rename to config.js to use

module.exports = {
    /* slack api token */
    slackAPIKey: '',

    ENV: (function () { return process.env.NODE_ENV ? process.env.NODE_ENV : 'dev'; }()),

    /* file to store break data if a restart occurs */
    savefile: 'var/breaks.save',

    /* file to store wrapup data if a restart occurs */
    wrapupfile: 'var/wrapup.save',

    /* channels to operate in */
    channels: [
        "breakbot-support",
        "breakbot-livechat",
        "breakbot-windows",
        "breakbot_test"
    ],

    /* path to the database containing command logs */
    logfile: {
        test: './test/logging.db',
        dev: './logs/logging.db',
        stage: './logs/logging.db'
    },

    loglevel: 'error'
};