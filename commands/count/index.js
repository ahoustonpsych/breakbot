var slack = require('../../lib/slack').rtm;
var requests = require('../lc_requests');
var breaks = require('../breaks');
var db = require('../../lib/database');

var conf = require('../../conf/config');
var conf_breaks = require('../../conf/breaks.config');

var offs = {'!count': 1, 'breakbot': 2};

/*
 * USAGE:
 * !out [user]
 * sets [user] to "not accepting chats" indefinitely
 * [user] defaults to the user that sent the message, if not given
 */
module.exports = {
    expr: /^(!count)|(breakbot:? count)/i,
    run: count
};

function count(data) {
    if (slack.dataStore.getChannelGroupOrDMById(data.channel).name !== conf.notifychannel[conf.ENV]) {
        console.log('nope');
        return;
    }

    if (data.text.split(' ')[0].match(/^!count/i) !== null)
        off = offs['!count'];
    else
        off = offs['breakbot'];

    var username = undefined;

    /* allows you to use !out [name] to log someone else out */
    var user = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    var arg = data.text.split(' ')[off];
    var newcount = parseInt(data.text.split(' ')[off+1]);

    if (arg && arg.match(/me/i) === null) {
        try {
            username = slack.dataStore.getUserByName(arg).profile.email.split('@')[0];
        }
        catch (e) {
            slack.sendMessage('Invalid user: ' + arg, data.channel);

            //logging
            console.error(new Date() + ': ' + user + ' used !out with invalid user "' + arg + '"');
            return;
        }
    }

    else {
        username = user;
    }

    requests.changeCount(username, newcount)
        .then(function (res) {
            slack.sendMessage('Successfully changed chat count to: ' + newcount, data.channel);
        })
        .catch(function (err) {
            console.error(err);
            console.error('ERROR CHANGING CHAT COUNT');
        })

}