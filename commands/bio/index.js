let slack = require('../../lib/slack').rtm;

let db = require('../../lib/database');
let globals = require('../../conf/config.globals');

let Helpers = require('../../lib/helpers');

/* bio time */
let TIME = 5;

module.exports = {
    expr: /^(!bio)|(breakbot:? bio)/i,
    run: bio
};

function bio(data) {

    let chanObj = globals.channels[data.name],
        breaks = chanObj.breaks;

    /* uncomment if bio breaks should count toward the daily limit */
    // if (!breakLib.canTakeBreak(data.username, data.name))
    //     return false;

    delete breaks.task[data.username];
    chanObj.clearBreaks(data.username);

    setBio(data.username, TIME, chanObj);

    /* logging */
    let logdata = {
        username: data.username,
        channel: data.name,
        command: '!bio',
        duration: TIME,
        date: 'now'
    };

    db.log('command_history', logdata)
        .catch(function (err) {
            console.error(new Date().toLocaleString() + ' ERROR LOGGING COMMAND', err);
        });
}

/*
 * sets user on bio break for 5 minutes
 */
function setBio(user, time, chanObj) {
    let breaks = chanObj.breaks,
        breakStart = new Date().getTime(),
        expireTime = new Date(breakStart + time * 60 * 1000),
        expireFormatted = Helpers.formatTime(expireTime);

    breaks.bio[user] = {
        outTime: breakStart,
        duration: time,
        channel: chanObj.name,
        remaining: time
    };

    slack.sendMessage(`Set ${time.toString()} minute bio for ${user}. See you at ${expireFormatted}!`, chanObj.id);

}