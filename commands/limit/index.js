var slack = require('../../lib/slack').rtm;
var requests = require('../lc_requests');
var breaks = require('../breaks');
var db = require('../../lib/database');

var conf = require('../../conf/config');

var offs = {'!limit': 1, 'breakbot': 2};

/*
 * USAGE:
 * !out [user]
 * sets [user] to "not accepting chats" indefinitely
 * [user] defaults to the user that sent the message, if not given
 */
module.exports = {
    expr: /^(!limit)|(breakbot:? limit)/i,
    run: limit
};

function limit(data) {
    //disabling unless I need it
    return false;

    //limit usage to captain channel
    if (slack.dataStore.getChannelGroupOrDMById(data.channel).name !== conf.notifychannel[conf.ENV]) {
        return false;
    }

    if (data.text.split(' ')[0].match(/^!limit/i) !== null)
        off = offs['!limit'];
    else
        off = offs['breakbot'];

    var username = undefined;

    var user = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    var arg = data.text.split(' ')[off];

    //fail if no args given
    if (!arg) {
        slack.sendMessage('no user/limit given', data.channel);
        return false;
    }

    //set limit to either arg1 or arg2, whichever comes first
    if (parseInt(arg)) {
        newlimit = parseInt(arg);
        arg = user;
    }

    else {
        newlimit = parseInt(data.text.split(' ')[off+1]);
    }

    //fail if limit isn't given
    if (!newlimit) {
        slack.sendMessage('invalid limit', data.channel);
        return false;
    }

    if (newlimit > 3) {
        slack.sendMessage('yeah right, overachiever', data.channel);
        return false;
    }

    if (newlimit < 1) {
        slack.sendMessage('negative chats? get to work son', data.channel);
        return false;
    }

    //verify user given
    if (arg.match(/^me$/i) === null) {
        try {
            username = slack.dataStore.getUserByName(arg).profile.email.split('@')[0];
        }
        catch (e) {
            slack.sendMessage('invalid user: ' + arg, data.channel);

            //logging
            console.error(new Date() + ': ' + user + ' used !limit with invalid user "' + arg + '"');
            return false;
        }
    }

    else {
        username = user;
    }

    slack.sendMessage('Successfully changed chat limit for ' + username + ' (limit: ' + newlimit + ')', data.channel);

    // requests.changeLimit(username, newlimit)
    //     .then(function (res) {
    //         slack.sendMessage('Successfully changed chat limit for ' + username + ' (limit: ' + newlimit + ')', data.channel);
    //     })
    //     .catch(function (err) {
    //         console.error(err);
    //         console.error('ERROR CHANGING CHAT LIMIT');
    //     })

}