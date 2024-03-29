let slack = require('../../lib/slack').rtm;
let db = require('../../lib/database');

/* TODO: add link to command list */
let helpMsg =
    'Command list: ';

/*
 * USAGE:
 * !help
 * sends help message
 */
module.exports = {
    expr: /^(!help)|(breakbot:? help)/i,
    run: help
};

function help(data) {
    slack.sendMessage(helpMsg, data.channel);

    /* logging */
    let logdata = {
        username: data.username,
        channel: data.name,
        date: 'now',
        command: '!help'
    };

    db.log('command_history', logdata)
        .catch(function (err) {
            console.error(new Date().toLocaleString() + ' ERROR LOGGING COMMAND', err);
        });
}
