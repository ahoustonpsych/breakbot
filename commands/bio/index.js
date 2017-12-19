let slack = require('../../lib/slack').rtm;

let db = require('../../lib/database');
let globals = require('../../conf/config.globals');

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
        expireTime = new Date(new Date().getTime() + time * 60 * 1000),
        meridiem = expireTime.getHours() > 12 ? 'PM' : 'AM',
        expireHours = expireTime.getHours() > 12 ? expireTime.getHours() % 12 : expireTime.getHours(),
        expireMinutes = expireTime.getMinutes() < 10 ? '0' + expireTime.getMinutes() : expireTime.getMinutes(),
        expireFormatted = `${expireHours}:${expireMinutes} ${meridiem}`;

    breaks.bio[user] = {
        outTime: new Date().getTime(),
        duration: time,
        channel: chanObj.name,
        remaining: time
    };

    /* sets agent status to "not accepting chats" */
    slack.sendMessage(`Set ${time.toString()} minute bio for ${user}. See you at ${expireFormatted}!`, chanObj.id);

}