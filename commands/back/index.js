var slack = require('../../lib/slack').rtm;

var db = require('../../lib/database');
var requests = require('../lc_requests');
var breaks = require('../breaks');

/* argument offsets, used to allow multi-word commands */
var offs = {'!back': 1, 'breakbot': 2};

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

    if (data.text.split(' ')[0].match(/!back/i) !== null)
        off = offs['!back'];
    else
        off = offs['breakbot'];

    var username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];

    if (data.text.split(' ')[off])
        username = slack.dataStore.getUserByName(data.text.split(' ')[off]).profile.email.split('@')[0];

    /* change state to "accepting chats" */
    logIn(username, data);
}

function logIn(username, data) {

    slack.sendMessage(username + ': you have been logged back in.', data.channel);

    breaks.clearBreaks(username);
    delete breaks.out[username];

    requests.changeStatus(username, 'accepting chats')
        .then(function (res) {

            //logging
            //console.log(new Date() + ': logged in ' + username + ' with !back');
            db.logCommand(username, '!back', null)
                .catch(function (err) {
                    console.error('ERROR LOGGING COMMAND', err);
                });
        })
        .catch(function (err) {
            console.error('ERROR CHANGING STATUS', err);
        });
}