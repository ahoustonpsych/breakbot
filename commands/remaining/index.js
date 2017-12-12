let slack = require('../../lib/slack').rtm;

let conf_breaks = require('../../conf/config.breaks');
let globals = require('../../conf/config.globals');
let db = require('../../lib/database');

module.exports = {
    expr: /^(!remaining)|(breakbot:? remaining)/i,
    run: remaining
};

function remaining(data) {
    let chanObj = globals.channels[data.name],
        remMsg = 'm until cooldown expires)',
        breaksLeft = conf_breaks.maxDailyBreaks,
        cooldownRemaining;

    if (!!chanObj.meta.cooldown[data.username]) {
        cooldownTime = new Date().getTime() - chanObj.meta.cooldown[data.username].getTime();
        cooldownRemaining = Math.ceil(Math.abs(cooldownTime / 60 / 1000));
        remMsg = '\n(' + cooldownRemaining.toString() + remMsg
    }
    else
        remMsg = '';

    if (chanObj.meta.count.hasOwnProperty(data.username))
        breaksLeft -= chanObj.meta.count[data.username];

    slack.sendMessage('breaks remaining: ' + breaksLeft + remMsg, data.channel);

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