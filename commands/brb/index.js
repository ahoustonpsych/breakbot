let slack = require('../../lib/slack').rtm;
let Promise = require('promise');

let conf_breaks = require('../../conf/config.breaks');
let globals = require('../../conf/config.globals');

let breakLib = require('../breaks');
let db = require('../../lib/database');


/* USAGE:
 * !brb [time]
 * sets timer for [time] minutes
 * and sets user to "not accepting chats"
 * sends reminder every remindTime seconds when the break expires
 */
module.exports = {
    expr: /^(!brb)|(breakbot:? brb)/i,
    run: brb
};

function brb(data) {
    let chanObj = globals.channels[data.name],
        username = data.username,
        arg = data.text.split(' ')[0];

    /* offset time arg by 1 place if "me" is used */
    if (breakLib.isMe(arg))
        arg = data.text.split(' ')[1];

    /* debug. uncomment to allow !brb [time] [user] to set another user on break */
    // if (data.text.split(' ')[1])
    //    username = slack.getUser(data.text.split(' ')[1]).name;

    /* prevents users from taking a break if they're already on break */
    // if (breakLib.isOnBreak(username, data.name)) {
    //     slack.sendMessage('already on break', data.channel);
    //     return false;
    // }

    if (!breakLib.canTakeBreak(username, data.name))
        return false;

    breakLib.parseBreakTime(arg)
        .then((parsedTime) => {

            setBrb(username, parsedTime, chanObj);

            /* logging */
            let logdata = {
                username: username,
                channel: data.name,
                command: '!brb',
                duration: parsedTime,
                date: 'now'
            };

            db.log('command_history', logdata)
                .catch(function (err) {
                    console.error(new Date().toLocaleString() + ' ERROR LOGGING COMMAND', err);
                });
        })
        .catch(function (err) {
            console.error(new Date().toLocaleString() + ' ERROR PARSING BREAK TIME', err);
        });
}

/*
 * sets user on break for "time" minutes
 */
function setBrb(user, time, chanObj) {
    let breaks = chanObj.breaks;

    if (breaks.task.hasOwnProperty(user))
        delete breaks.task[user];

    breaks.active[user] = {
        outTime: new Date().getTime(),
        duration: time,
        channel: chanObj.name,
        remaining: time
    };

    /* set break cooldown */
    breaks.cooldown[user] =
        new Date(new Date().getTime() + 60 * 1000 * (conf_breaks.breakCooldown + time));

    /* notify user */
    slack.sendMessage('Set break for ' + user + ' for ' + time.toString() + ' minutes.', chanObj.id);

    return true;
}
