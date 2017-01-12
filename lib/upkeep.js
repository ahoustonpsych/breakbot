
var Promise = require('promise');

var slack = require('../lib/slack').rtm;

var conf = require('../conf/config');
var conf_breaks = require('../conf/breaks.config');

var requests = require('../commands/lc_requests');
var breaks = require('../commands/breaks');

module.exports = {
    upkeep: upkeep
};

/* runs every second */
function upkeep() {

    /* handle users on break */
    upkeepOnBreak()
        .then(function () {
            /* handle users over break */
            upkeepOverBreak();

            upkeepLunch();

            upkeepBio();
        })
        .catch(function (err) {
            console.error('ERROR WITH ONBREAK UPKEEP', err);
        });

    /* handle users that are out */
    if (Math.floor(process.uptime()) % 30 === 0)
        upkeepOut();

    if (Math.floor(process.uptime()) % 60 === 0)
        checkBounces();

}

function upkeepOnBreak() {
    return new Promise(function (fulfill, reject) {

        var now = new Date().getTime();

        /* current users on break */
        for (var user in breaks.onbreak) {

            if (conf.ENV === 'dev') {
                console.log('user: ' + user);
                console.log('now: ' + now);
                console.log('outTime: ' + breaks.onbreak[user].outTime);
                console.log('duration: ' + breaks.onbreak[user].duration);
                console.log('channel: ' + breaks.onbreak[user].channel);
                console.log('remaining: ' + breaks.onbreak[user].remaining);
            }
            /* minutes remaining in break */
            breaks.onbreak[user].remaining = Math.floor(Math.abs((now - (breaks.onbreak[user].outTime + (breaks.onbreak[user].duration * 1000))) / 1000));

            /* now - (time of break + duration of break) in seconds */
            var delta = (now - (breaks.onbreak[user].outTime + (breaks.onbreak[user].duration * 1000))) / 1000;

            /* break expired */
            if (delta > 0)
                breakExpired(user, breaks.onbreak);

            else if (conf.ENV === 'dev')
                console.log(user + '\'s break expires in ' + delta + ' seconds.');
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
        else if (breaks.lunch[user] instanceof Object) {
            delete breaks.lunch[user];
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

    var now = new Date().getTime();

    for (var user in breaks.out) {

        /* expire users on break > 4 hours */
        if ((breaks.out[user] + 4 * 60 * 1000) > now) {
            delete breaks.out[user];
            continue;
        }
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

function upkeepLunch() {

    var now = new Date().getTime();

    /* current users on lunch */
    for (var user in breaks.lunch) {

        if (conf.ENV === 'dev') {
            console.log('user: ' + user);
            console.log('now: ' + now);
            console.log('outTime: ' + breaks.lunch[user].outTime);
            console.log('duration: ' + breaks.lunch[user].duration);
            console.log('channel: ' + breaks.lunch[user].channel);
            console.log('remaining: ' + breaks.lunch[user].remaining);
        }

        /* minutes remaining in lunch */
        breaks.lunch[user].remaining = Math.floor(Math.abs((now - (breaks.lunch[user].outTime + (breaks.lunch[user].duration * 1000))) / 1000));

        /* now - (time of break + duration of break) in seconds */
        var delta = (now - (breaks.lunch[user].outTime + (breaks.lunch[user].duration * 1000))) / 1000;

        /* break expired */
        if (delta > 0)
            breakExpired(user, breaks.lunch);

        else if (conf.ENV === 'dev')
            console.log(user + '\'s break expires in ' + delta + ' seconds.');
    }
}

function upkeepBio() {

    var now = new Date().getTime();

    /* current users on lunch */
    for (var user in breaks.bio) {

        if (conf.ENV === 'dev') {
            console.log('user: ' + user);
            console.log('now: ' + now);
            console.log('outTime: ' + breaks.bio[user].outTime);
            console.log('duration: ' + breaks.bio[user].duration);
            console.log('channel: ' + breaks.bio[user].channel);
            console.log('remaining: ' + breaks.bio[user].remaining);
        }

        /* minutes remaining in lunch */
        breaks.bio[user].remaining = Math.floor(Math.abs((now - (breaks.bio[user].outTime + (breaks.bio[user].duration * 1000))) / 1000));

        /* now - (time of break + duration of break) in seconds */
        var delta = (now - (breaks.bio[user].outTime + (breaks.bio[user].duration * 1000))) / 1000;

        /* break expired */
        if (delta > 0)
            breakExpired(user, breaks.bio);

        else if (conf.ENV === 'dev')
            console.log(user + '\'s break expires in ' + delta + ' seconds.');
    }
}

/*
 * processes users whose break just expired. sends notification if they haven't already logged back in
 */
function breakExpired(user, list) {

    /* switches user from "on break" to "over break" */
    breaks.overbreak[user] = JSON.parse(JSON.stringify(list[user]));

    requests.getAgentStatus(user)
        .then(function (res) {
            console.log(res);

            /* checks if user already logged back in */
            if (res === 'not accepting chats') {
                slack.sendMessage(user + ': your break has expired.', breaks.overbreak[user].channel);
                delete list[user];
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

    requests.getAgentStatus(user)
        .then(function (res) {
            if (res === 'not accepting chats') {
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