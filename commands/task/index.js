var slack = require('../../lib/slack').rtm;
var requests = require('../lc_requests');
let globals = require('../../conf/config.globals');
//var breaks = require('../breaks');
var db = require('../../lib/database');

var offs = {'!task': 1, 'breakbot': 2};

/*
 * USAGE:
 * !task [user]
 * sets [user] to "not accepting chats" indefinitely
 * [user] defaults to the user that sent the message, if not given
 */
module.exports = {
    expr: /^(!task)|(breakbot:? task)/i,
    run: task
};

function task(data) {

    if (data.text.split(' ')[0].match(/^!task/i) !== null)
        off = offs['!task'];
    else
        off = offs['breakbot'];

    /* list of users passed into !task */
    var users = undefined;

    /* user who sent the !task message */
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

    /* log task users */
    if (users instanceof Array)
        putOnTask(data, users);

    else
        console.error('INVALID LIST OF USERS FOR !task: ' + users);

}

function putOnTask(data, users) {

    let breaks = globals.channels[data.name].breaks;

    if (users.length > 1)
        slack.sendMessage('Put on task: ' + users.join(' ') + '. Please use *!back* to log back in when you are done',
            data.channel);

    else if (users.length == 1)
        slack.sendMessage('Put on task: ' + users + '. Please use *!back* to log back in when you are done',
            data.channel);

    else
        console.error('invalid user list for !task somehow: ' + users);

    /* log task each user */
    users.forEach(function (user) {

        /* nuke existing breaks */
        breaks.clearBreaks(user);
        breaks.task[user] = new Date().getTime();

        /* logging */
        //TODO log reason
        let logdata = {
            username: user,
            command: '!task',
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
        //             command: '!task',
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