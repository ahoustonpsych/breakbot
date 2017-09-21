var slack = require('../../lib/slack').rtm;

var db = require('../../lib/database');
var requests = require('../lc_requests');
let globals = require('../../conf/config.globals');
let breaks;
//var breaks = require('../breaks');

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

    let username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];

    //if (data.text.split(' ')[off])
    //    username = slack.dataStore.getUserByName(data.text.split(' ')[off]).profile.email.split('@')[0];
    logIn(data, username);

}

/* log user in */
function logIn(data, username) {

    let breaks = globals[data.name].breaks;

    slack.sendMessage(username + ': you have been logged back in.', data.channel);

    breaks.clearBreaks(username, data.name);
    delete breaks.out[username];

    /* logging */
    let logdata = {
        username: username,
        date: 'now',
        command: '!back'
    };
    db.log('command_history', logdata)
        .catch(function (err) {
            console.error('ERROR LOGGING COMMAND', err);
        });

    // requests.changeStatus(username, 'accepting chats')
    //     .then(function (res) {
    //
    //         /* logging */
    //         var logdata = {
    //             username: username,
    //             date: 'now',
    //             command: '!back'
    //         };
    //         db.log('command_history', logdata)
    //             .catch(function (err) {
    //                 console.error('ERROR LOGGING COMMAND', err);
    //             });
    //     })
    //     .catch(function (err) {
    //         console.error('ERROR CHANGING STATUS', err);
    //     });
}