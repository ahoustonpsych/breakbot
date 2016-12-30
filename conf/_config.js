// rename to config.js to use

module.exports = {
    /* slack api token */
    slackAPIKey: '',

    /* livechat api credentials */
    lcAPIUser: 'yourname@liquidweb.com',
    lcAPIKey: '',

    ENV: (function () { return process.env.NODE_ENV ? process.env.NODE_ENV : 'dev'; }()),

    channel: {
        test: 'breakbot_test',
        dev: 'breakbot_test',
        stage: 'breakbot_stage'
    },

    /* path to the database containing command logs */
    logfile: {
        test: './test/logging.db',
        dev: './logs/logging.db',
        stage: './logs/logging.db'
    },
    loglevel: 'error'
};