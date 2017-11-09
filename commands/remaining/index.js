let slack = require('../../lib/slack').rtm;

let conf_breaks = require('../../conf/config.breaks');
let globals = require('../../conf/config.globals');
let db = require('../../lib/database');

module.exports = {
    expr: /^(!remaining)|(breakbot:? remaining)/i,
    run: remaining
};

function remaining(data) {

    if (!globals.channels.hasOwnProperty(data.name))
        return false;

    let breaksLeft = conf_breaks.maxDailyBreaks;

    if (globals.channels[data.name].breaks.count.hasOwnProperty(data.username))
        breaksLeft -= globals.channels[data.name].breaks.count[data.username];

    slack.sendMessage('breaks remaining: ' + breaksLeft, data.channel);

    /* logging */
    let logdata = {
        username: data.username,
        channel: data.name,
        command: '!remaining',
        date: 'now'
    };

    db.log('command_history', logdata)
        .catch(function (err) {
            console.error(new Date().toLocaleString() + ' ERROR LOGGING COMMAND', err);
        });

}