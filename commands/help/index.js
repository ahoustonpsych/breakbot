var slack = require('../../lib/slack').rtm;
var db = require('../../lib/database');

var helpMsg =
    'Command list: https://git.liquidweb.com/ahouston/breakbot/wikis/home';

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
    var logdata = {
        date: 'now',
        command: '!help'
    };

    db.log('command_history', logdata)
        .catch(function (err) {
            console.error('ERROR LOGGING COMMAND', err);
        });
}
