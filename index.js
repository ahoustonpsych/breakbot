
var Promise = require('promise');

var express = require('express');
var app = express();

var slack = require('./lib/slack').rtm;
var web = require('./lib/slack').web;

var conf = require('./conf/config');
var conf_breaks = require('./conf/breaks.config');

var messageController = require('./lib/messageController');
var breaks = require('./commands/breaks');
var requests = require('./commands/lc_requests');
var db = require('./lib/database');
var topic = require('./commands/topic');

/* localhost/users
 * endpoint that returns the emails of all LW employees
 * mostly current employees, but sadly some former employees are mixed in as well
 * does not include users that don't have an @liquidweb.com email (cloudsites, wiredtree, etc.)
 */
app.get('/users', function (req,res) {

    var list = [];
    var user = undefined;

    Object.keys(slack.dataStore.users).forEach(function (id) {

        user = slack.dataStore.users[id];

        /* strips out users with no email and deactivated accounts */
        if (user.profile.email !== undefined
            && user.profile.email.match(/@liquidweb\.com/i) !== null
            && !user.deleted)
            list.push(user.profile.email);
    });

    /* jsonify results and send as response */
    res.end(JSON.stringify(list));
});


slack.on('authenticated', function (data) {
    data.channels.forEach(function (chan) {
        if (chan.is_member === true) {
            topic.topic = chan.topic.value;
        }
    });

    //private channels
    /*
     data.groups.forEach(function (group) {
     console.log("got " + group.name);
     });
     */
});

/* always listening */
slack.on('message', function (data) {
    if (slack.dataStore.getChannelGroupOrDMById(data.channel).name === conf.channel[conf.ENV])
        messageController.handle(data);
});

/* runs every second */
function upkeep() {

    /* handle users on break */
    upkeepOnBreak()
        .then(function () {
            /* handle users over break */
            upkeepOverBreak();
        })
        .catch(function (err) {
            console.error('ERROR WITH ONBREAK UPKEEP', err);
        });

    /* handle users that are out */
    if (Math.floor(process.uptime()) % 30 === 0)
        upkeepOut();

    if (Math.floor(process.uptime()) % 60 === 0)
        checkBounces();

    //if (Math.floor(process.uptime()) % 60 === 0)
    //    notifyBounces();
}

function upkeepOnBreak() {
    return new Promise(function (fulfill, reject) {

        var now = new Date().getTime();

        /* current users on break */
        for (var user in breaks.onbreak) {

            console.log('user: ' + user);
            console.log('now: ' + now);
            console.log('outTime: ' + breaks.onbreak[user].outTime);
            console.log('duration: ' + breaks.onbreak[user].duration);
            console.log('channel: ' + breaks.onbreak[user].channel);
            console.log('remaining: ' + breaks.onbreak[user].remaining);

            /* minutes remaining in break */
            breaks.onbreak[user].remaining = Math.floor(Math.abs((now - (breaks.onbreak[user].outTime + (breaks.onbreak[user].duration * 1000))) / 1000));

            /* now - (time of break + duration of break) in seconds */
            var delta = (now - (breaks.onbreak[user].outTime + (breaks.onbreak[user].duration * 1000))) / 1000;

            /* break expired */
            if (delta > 0) {
                breakExpired(user);
            }
            else {
                console.log(user + '\'s break expires in ' + delta + ' seconds.');
            }
        }
        fulfill();
    });
}

function upkeepOverBreak() {

    var now = new Date().getTime();

    for (var user in breaks.overbreak) {

        /* removes user from being "on break" if it hasn't finished already */
        if (breaks.onbreak[user] instanceof Object) {
            delete breaks.onbreak[user];
            continue;
        }

        var delta = (now - (breaks.overbreak[user].outTime + (breaks.overbreak[user].duration * 1000))) / 1000;

        /* send reminder every conf_breaks.remindTime seconds */
        if (parseInt(delta) % conf_breaks.remindTime === 0) {
            sendReminder(user);
        }
    }
}

function upkeepOut() {
    for (var user in breaks.out) {
        requests.getAgentStatus(user)
            .then(function (res) {

                /* checks if user already logged back in (or logged out altogether) */
                if (res === 'accepting chats' || res === 'offline')
                    delete breaks.out[user];

            })
            .catch(function (err) {
                console.error(err);
            });
    }
}

/*
 * processes users whose break just expired. sends notification if they haven't already logged back in
 */
function breakExpired(user) {

    /* switches user from "on break" to "over break" */
    breaks.overbreak[user] = breaks.onbreak[user];

    requests.getAgentStatus(user)
        .then(function (res) {
            console.log(res);

            /* checks if user already logged back in */
            if (res === 'not accepting chats') {
                slack.sendMessage(user + ': your break has expired.', breaks.overbreak[user].channel);
                delete breaks.onbreak[user];
            }
            else {
                breaks.clearBreaks(user);
                console.log(user + ' silently logged back in. Deleting metadata.');
            }
        })
        .catch(function (err) {
            console.error(err);
        });
}

/*
 * sends message reminding agent to log back in, if they haven't already
 */
function sendReminder(user) {
    //console.log('checking status of ' + user);
    requests.getAgentStatus(user)
        .then(function (res) {
            if (res === 'not accepting chats') {
                // console.log("CHAN: " + breaks.overbreak[user].channel);
                // console.log("USER: " + user);
                slack.sendMessage(user + ': you need to log back into chats with *!back*', breaks.overbreak[user].channel);
            }
            else {
                breaks.clearBreaks(user);
                console.log(user + ' silently logged back in. Deleting metadata.');
            }
        })
        .catch(function (err) {
            console.error('ERROR GETTING AGENT STATUS', err);
        });
}

/* checks for and logs chats that have bounced recently (in the last minute) */
function checkBounces() {
    requests.getChats()
        .then(function (data) {
            if (data instanceof Array) {
                data.forEach(function (chat) {
                    chat.events.forEach(function (event) {
                        if (event.type === 'event')
                            if (event.text.match(/The chat was transferred to .+?(?=because)because .+?(?=had)had not replied for 1 minute\./) != null) {
                                db.logBounce(event.timestamp, event.date, event.agent_id)
                                    .then(function () {
                                        slack.sendMessage(event.date + ': ' + event.agent_id + ' bounced a chat', slack.dataStore.getChannelOrGroupByName(conf.notifychannel[conf.ENV]).id);
                                    })
                                    .catch(function (err) {
                                        if (err.code !== 'SQLITE_CONSTRAINT')
                                            console.error('ERROR LOGGING BOUNCES', err);
                                    });
                            }
                    });
                })
            }
        })
        .catch(function (err) {
            console.error('ERROR GETTING RECENT CHATS', err);
        });
}

/*
 * notifies chat captain when a chat bounces, within 1 minute of it happening
 */
function notifyBounces() {
    var query = 'SELECT date,user from bounces where timestamp > ' +
        parseInt(new Date(new Date() - 60000).getTime() / 1000);

    /* logs bounced chat info to the "bounces" table */
    db.db.each(query, function (err, res) {
        if (err) console.error(err);
        else {
            slack.sendMessage(res.date + ': ' + res.user + ' bounced a chat', slack.dataStore.getChannelOrGroupByName(conf.notifychannel[conf.ENV]).id);
            console.log(res.date + ': ' + res.user);
            /*
            web.im.open(slack.dataStore.getUserByName(topic.captain).id, function (err, profile) {
                if (err) console.error('invalid slack user', err);
                else {
                    slack.sendMessage(res.date + ': ' + res.user + ' bounced a chat', profile.channel.id);
                    console.log(res.date + ': ' + res.user);
                }
            });
            */
        }
    });
}

function main() {

    db.initdb();

    var server = app.listen(1337, function () {
        var host = server.address().address;
        var port = server.address().port;

        console.log("listening at http://%s:%s", host, port);
    });

    /* runs upkeep every second */
    setInterval(upkeep, 1000);
}

/* run */
if (require.main === module)
    main();