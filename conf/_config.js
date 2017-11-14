// rename to config.js to use

module.exports = {
    /* slack api token */
    slackAPIKey: '',

    /* user to connect to wallboard */
    wallboardUser: '',
    /* key to authenticate to wallboard */
    wallboardKey: '',

    /* database connection information */
    dbInfo: {
        dev: {
            db: 'breakbot_logging_test',
            host: 'localhost',
            user: 'breakbot',
            pass: ''
        },
        stage: {
            db: 'breakbot_logging',
            host: 'localhost',
            user: 'breakbot',
            pass: ''
        }
    },

    ENV: (function () { return process.env.NODE_ENV ? process.env.NODE_ENV : 'dev'; }()),

    /* files to use for temp break storage if a restart occurs */
    restore: {
        savefile: 'var/breaks.save',
        wrapupfile: 'var/wrapup.save'
    },

    /* channels to operate in */
    channels: [
        'break',
        'livechat',
    ],

    /* ties channels to departments*/
    channelDesignation: {
        'support': 'breakbot-support',
        'livechat': 'breakbot-livechat'
    },

    /* path to the database containing command logs */
    logfile: {
        test: './test/logging.db',
        dev: './logs/logging.db',
        stage: './logs/logging.db'
    },

    loglevel: 'error'
};