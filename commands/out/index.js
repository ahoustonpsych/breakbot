var slack = require('../../lib/slack').rtm;
var requests = require('../lc_requests');
let globals = require('../../conf/config.globals');
//var breaks = require('../breaks');
var db = require('../../lib/database');

var offs = {'!out': 1, 'breakbot': 2};

/*
 * USAGE:
 * !out [user]
 * sets [user] to "not accepting chats" indefinitely
 * [user] defaults to the user that sent the message, if not given
 */
module.exports = {
    expr: /^(!out)|(breakbot:? out)/i,
    run: out
};

function out(data) {

    if (data.text.split(' ')[0].match(/^!out/i) !== null)
        off = offs['!out'];
    else
        off = offs['breakbot'];

    /* list of users passed into !out */
    var users = undefined;

    /* user who sent the !out message */
    var user = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];

    /* split up the list of users, discarding 'invalid' ones except for 'me' */
    users = data.text.split(' ')
        .slice(off)
        .filter(function (el) {

            /* match 'me' for later use */
            if (el.match(/^me$/i) !== null)
                return true;

            /* match usernames if given, and discard the rest */
            else
                return (slack.dataStore.getUserByName(el) instanceof Object);

        })
        .map(function (el) {

            /* replace 'me' with your username if given */
            if (el.match(/^me$/i) !== null)
                return slack.dataStore.getUserById(data.user).name;

            /* otherwise, don't do anything */
            return el;

        });

    /* if we have an invalid array somehow, just default to the user that sent the message*/
    if (users instanceof Array) {
        if (users.length === 0) {
            users = [slack.dataStore.getUserById(data.user).name];
        }
    }

    else
        users = [user];

    /* log out users */
    if (users instanceof Array)
        logOut(data, users);

    else
        console.error('INVALID LIST OF USERS FOR !out: ' + users);

}

function logOut(data, users) {

    let breaks = globals[data.name].breaks;

    if (users.length > 1)
        slack.sendMessage('Logged out: ' + users.join(' ') + '. Please use *!back* to log back in when you are ready',
            data.channel);

    else if (users.length == 1)
        slack.sendMessage('Logged out ' + users + '. Please use *!back* to log back in when you are ready',
            data.channel);

    else
        console.error('invalid user list for !out somehow: ' + users);

    /* log out each user */
    users.forEach(function (user) {

        /* nuke existing breaks */
        breaks.clearBreaks(user, data.name);
        breaks.out[user] = new Date().getTime();

        /* logging */
        var logdata = {
            username: user,
            command: '!out',
            date: 'now'
        };

        db.log('command_history', logdata)
            .catch(function (err) {
                console.error('ERROR LOGGING COMMAND', err);
            });

        // requests.changeStatus(user, 'not accepting chats')
        //     .then(function (res) {
        //
        //         /* logging */
        //         var logdata = {
        //             username: user,
        //             command: '!out',
        //             date: 'now'
        //         };
        //
        //         db.log('command_history', logdata)
        //             .catch(function (err) {
        //                 console.error('ERROR LOGGING COMMAND', err);
        //             });
        //
        //     })
        //     .catch(function (err) {
        //         console.error('ERROR CHANGING STATUS FOR: ' + user, err);
        //     });
    });
}