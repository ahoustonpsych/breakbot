// rename to config.js to use

module.exports = {
    /* slack api token */
    slackAPIKey: '',

    /* livechat api credentials */
    lcAPIUser: 'yourname@liquidweb.com',
    lcAPIKey: '',

    ENV: (function () { return process.env.NODE_ENV ? process.env.NODE_ENV : 'dev'; }()),

    /* file to store break data if a restart occurs */
    savefile: 'var/breaks.save',

    /* chat channel to operate in */
    channel: {
        test: 'breakbot_test',
        dev: 'breakbot_test',
        stage: 'breakbot_stage'
    },

    /* channel to send bounce notifications to */
    notifychannel: {
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

    /* temporary. domain associated with livechatinc user accounts */
    userdomain: {
        test: '@bnewman.fail',
        dev: '@bnewman.fail',
        stage: '@liquidweb.com'
    },

    loglevel: 'error'
};