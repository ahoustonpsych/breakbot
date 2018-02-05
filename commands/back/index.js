let _ = require('lodash');
let slack = require('../../lib/slack').rtm;

let globals = require('../../conf/config.globals');
let breakLib = require('../breaks');

let conf_breaks = require('../../conf/config.breaks');

let db = require('../../lib/database');

/*
 * USAGE:
 * !back or breakbot back
 * sets user status to "accepting chats"
 */
module.exports = {
    expr: /^(!back)|(breakbot:? back)/i,
    run: back
};

function back(data) {

    let userList,
        msgArr = data.text.split(' '),
        chanObj = globals.channels[data.name];

    if (_.size(msgArr) === 1) {
        if (msgArr[0] === '') {
            userList = [data.username];
        }
        else {
            userList = msgArr;
        }
    } else {
        userList = msgArr
    }

    if (chanObj.isSuper(data.username)) {
        _.each(msgArr, user => {
            user = user.toLowerCase();
            if (slack.isUser(user))
                userList.push(user);
            else {
                console.log(new Date().toLocaleString(), 'bad user:', user);
            }
        })
    } else { //user using !back, no extra args
        userList.push(data.username);
        console.log('not a super:', data.username);
    }

    continueBack(data,userList);

}

function continueBack(data, userList) {

    let chanObj = globals.channels[data.name],
        meta = chanObj.meta;

    _.each(userList, user => {
        if (!breakLib.isOnBreak(user, data.name))
            console.log(new Date().toLocaleString(), 'err: not on break:', user);
        else {
            if (meta.cooldownGrace.hasOwnProperty(user)) {
                clearTimeout(meta.cooldownGrace[user]);
            }

            removeBreak(user, data);

            /* logging */
            let logdata = {
                username: user,
                channel: data.name,
                date: 'now',
                command: '!back'
            };

            db.log('command_history', logdata)
                .catch(function (err) {
                    console.error(new Date().toLocaleString(), 'ERROR LOGGING COMMAND', err);
                });
        }
    });
}

/* log user in */
function removeBreak(user, data) {

    let chanObj = globals.channels[data.name],
        breaks = chanObj.breaks,
        rem = !!chanObj.meta.count[user] ? conf_breaks.maxDailyBreaks - chanObj.meta.count[user] : conf_breaks.maxDailyBreaks;

    chanObj.clearBreaks(user);
    delete breaks.task[user];

    slack.sendMessage(`${user}: welcome back! ${rem} breaks remaining`, data.channel);

}