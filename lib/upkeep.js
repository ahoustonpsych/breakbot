
var Promise = require('promise');

var slack = require('../lib/slack').rtm;

var conf = require('../conf/config');
var conf_breaks = require('../conf/breaks.config');

var requests = require('../commands/lc_requests');
var breaks = require('../commands/breaks');
var wrapup = require('../commands/wrapup');
var luncher = require('../commands/luncher');
var topic = require('../commands/topic');

var db = require('./database');


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
    //if (Math.floor(process.uptime()) % 15 === 0)
        //upkeepLoggedIn();

    if (Math.floor(process.uptime()) % 30 === 0)
        upkeepOut();

    if (Math.floor(process.uptime()) % 60 === 0)
        checkBounces();

    if (Math.floor(process.uptime()) % 60 === 0)
        checkLunch();

    if (Math.floor(process.uptime()) % 30 === 0)
        checkConcurrent();

}

function upkeepOnBreak() {
    return new Promise(function (fulfill, reject) {

        var now = new Date().getTime();

        /* current users on break */
        for (var user in breaks.onbreak) {

            if (conf.ENV === 'test') {
                console.log('user: ' + user);
                console.log('now: ' + now);
                console.log('outTime: ' + breaks.onbreak[user].outTime);
                console.log('duration: ' + breaks.onbreak[user].duration);
                console.log('channel: ' + breaks.onbreak[user].channel);
                console.log('remaining: ' + breaks.onbreak[user].remaining);
            }
            /* minutes remaining in break */
            breaks.onbreak[user].remaining = Math.floor(Math.abs((now - (breaks.onbreak[user].outTime + (breaks.onbreak[user].duration * 60 * 1000))) / 60000));

            /* now - (time of break + duration of break) in seconds */
            var delta = (now - (breaks.onbreak[user].outTime + (breaks.onbreak[user].duration * 60 * 1000))) / 60000;

            /* break expired */
            if (delta > 0) {
                breakExpired(user, breaks.onbreak);
            }

            else if (conf.ENV === 'test')
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
        if ((breaks.out[user] + 4 * 60 * 60 * 1000) < now) {
            delete breaks.out[user];
            continue;
        }
        requests.getAgent(user)
            .then(function (res) {

                status = res.status;
                user = res.login.split('@')[0];

                /* checks if user already logged back in (or logged out altogether) */
                if (status === 'accepting chats') {
                    delete breaks.out[user];
                    console.log(new Date().toLocaleString() + ' ' + user + ' silently changed status to: ' + status + '. deleting break data.');
                }
                else {
                    console.log(new Date().toLocaleString() + ' ' + user + ': ' + status);
                }

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

        if (conf.ENV === 'test') {
            console.log('user: ' + user);
            console.log('now: ' + now);
            console.log('outTime: ' + breaks.lunch[user].outTime);
            console.log('duration: ' + breaks.lunch[user].duration);
            console.log('channel: ' + breaks.lunch[user].channel);
            console.log('remaining: ' + breaks.lunch[user].remaining);
        }

        /* minutes remaining in lunch */
        breaks.lunch[user].remaining = Math.floor(Math.abs((now - (breaks.lunch[user].outTime + (breaks.lunch[user].duration * 60 * 1000))) / 60000));

        /* now - (time of break + duration of break) in seconds */
        var delta = (now - (breaks.lunch[user].outTime + (breaks.lunch[user].duration * 60 * 1000))) / 60000;

        /* break expired */
        if (delta > 0)
            breakExpired(user, breaks.lunch);

        else if (conf.ENV === 'test')
            console.log(user + '\'s break expires in ' + delta + ' seconds.');
    }
}

function upkeepBio() {

    var now = new Date().getTime();

    /* current users on lunch */
    for (var user in breaks.bio) {

        if (conf.ENV === 'test') {
            console.log('user: ' + user);
            console.log('now: ' + now);
            console.log('outTime: ' + breaks.bio[user].outTime);
            console.log('duration: ' + breaks.bio[user].duration);
            console.log('channel: ' + breaks.bio[user].channel);
            console.log('remaining: ' + breaks.bio[user].remaining);
        }

        /* minutes remaining in lunch */
        breaks.bio[user].remaining = Math.floor(Math.abs((now - (breaks.bio[user].outTime + (breaks.bio[user].duration * 60 * 1000))) / 60000));

        /* now - (time of break + duration of break) in seconds */
        var delta = (now - (breaks.bio[user].outTime + (breaks.bio[user].duration * 60 *1000))) / 60000;

        /* break expired */
        if (delta > 0)
            breakExpired(user, breaks.bio);

        else if (conf.ENV === 'test')
            console.log(user + '\'s break expires in ' + delta + ' seconds.');
    }
}

/*
 * processes users whose break just expired. sends notification if they haven't already logged back in
 */
function breakExpired(user, list) {

    /* switches user from "on break" to "over break" */
    breaks.overbreak[user] = JSON.parse(JSON.stringify(list[user]));

    requests.getAgent(user)
        .then(function (res) {

            status = res.status;
            user = res.login.split('@')[0];

            /* checks if user already logged back in */
            if (status === 'not accepting chats') {
                slack.sendMessage(user + ': your break has expired.', breaks.overbreak[user].channel);
                delete list[user];
            }
            else if (status === 'accepting chats') {
                breaks.clearBreaks(user);
                console.log(new Date().toLocaleString() + ' ' + user + ' silently changed status to: ' + status + '. deleting break data.');
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

    requests.getAgent(user)
        .then(function (res) {

            status = res.status;
            user = res.login.split('@')[0];

            if (status === 'not accepting chats') {
                slack.sendMessage(user + ': you need to log back into chats with *!back*', breaks.overbreak[user].channel);
            }

            else {
                breaks.clearBreaks(user);
                console.log(new Date().toLocaleString() + ' ' + user + ' silently changed status to: ' + status + '. deleting break data.');
            }
        })
        .catch(function (err) {
            console.error('ERROR GETTING AGENT STATUS', err);
        });
}

/* checks for and logs chats that have bounced recently (in the last minute) */
function checkBounces() {
    requests.getRecentChats()
        .then(function (data) {
            if (data instanceof Array) {
                data.forEach(function (chat) {
                    if (chat instanceof Object) {
                        if (chat.hasOwnProperty('events')) {
                            if (chat.events instanceof Array) {
                                chat.events.forEach(function (event) {
                                    if (event.type === 'event') {
                                        if (event.text.match(/The chat was transferred to .+?(?=because)because .+?(?=had)had not replied for [0-9] minute/) != null) {

                                            /* logging */
                                            var logdata = {
                                                timestamp: event.timestamp,
                                                date: event.date,
                                                username: event.agent_id
                                            };

                                            db.log('bounces', logdata)
                                                .then(function () {
                                                    slack.sendMessage(event.date + ': ' + event.agent_id + ' bounced a chat', slack.dataStore.getChannelOrGroupByName(conf.notifychannel[conf.ENV]).id);
                                                })
                                                .catch(function (err) {
                                                    if (err.code !== 'SQLITE_CONSTRAINT')
                                                        console.error('ERROR LOGGING BOUNCES', err);
                                                });

                                        }
                                    }
                                });
                            }
                        }
                    }
                })
            }
        })
        .catch(function (err) {
            console.error('ERROR GETTING RECENT CHATS', err);
        });
}

function checkLunch() {

    var now = new Date();

    if (!(luncher.schedule instanceof Object)) {
        console.error('BAD LUNCH OBJECT: ' + luncher.schedule);
        return false;
    }

    for (var user in luncher.schedule) {
        if (!(luncher.schedule[user].time instanceof Date)) {
            delete luncher.schedule[user];
            continue;
        }

        //send reminder 15 minutes prior to lunch time
        if (!luncher.schedule[user].notified && (luncher.schedule[user].time - 15 * 60 * 1000) <= now) {
            slack.sendMessage(user + ': get ready, lunch in 15!', luncher.schedule[user].channel);
            luncher.schedule[user].notified = 1;
        }

        //send reminder when lunch time rolls around
        else if ((luncher.schedule[user].time.getHours() % 12) === (now.getHours() % 12) && luncher.schedule[user].time.getMinutes() === now.getMinutes()) {
            slack.sendMessage(user + ': time for lunch! Use *!lunch* when you\'re ready!', luncher.schedule[user].channel);
        }

        //expire old lunches
        if (luncher.schedule[user].time.getTime() + conf_breaks.lunchExpire * 60 * 1000 <= now.getTime()) {
            console.log('lunch expired: ' + user + ', ' + luncher.schedule[user].time);
            delete luncher.schedule[user];
        }
    }
}

/*
function upkeepLoggedIn() {
    var chatters = topic.getChatters();

    requests.getAgents('not accepting chats', function (err, list) {
        if (err) return;
        else {
            //console.log(list);
            if (list instanceof Object)
                list.forEach(function (user) {
                    var name = user.login.split('@')[0];
                    if (chatters.indexOf(name) !== -1)
                        if (user.permission === 'normal')
                            if (!breaks.onbreak[name] &&
                                !breaks.overbreak[name] &&
                                !breaks.out[name] &&
                                !breaks.lunch[name] &&
                                !breaks.bio[name]) {
                                    if (!(breaks.illegal[name] instanceof Object)) {

                                        var logdata = {
                                            date: 'now',
                                            username: name,
                                            desc: 'logged out'
                                        };

                                        db.log('illegal', logdata)
                                            .then(function (res) {
                                                breaks.illegal[user.login] = 1;
                                                //slack.sendMessage(user.login + ' just logged out improperly (without the bot)'
                                                //    , slack.dataStore.getChannelOrGroupByName('breakbot_test').id);
                                            })
                                            .catch(function (err) {
                                                console.error('ERROR LOGGING ILLEGAL LOGOUT', err);
                                            });
                                    }
                            }
                });

            //console.log(chatters);
        }
    });

}
*/

//this whole thing should probably be moved
function checkConcurrent() {

    if (!(wrapup.concurrent instanceof Object))
        return false;

    var con = {};

    var now = new Date();

    //pull recent/active chats
    requests.getRecentChats()
        .then(function (all) {
            if (all instanceof Array) {
                all.forEach(function (chat) {
                    if (chat.hasOwnProperty('agents') && chat.hasOwnProperty('group')) {
                        if (chat.agents instanceof Array && chat.group instanceof Array) {

                            //only look at chats with support as their most recent group (group 1)
                            if (chat.group[chat.group.length - 1] !== 1)
                                return false;

                            //console.log(chat.agents[chat.agents.length - 1].email.split('@')[0]);
                            //get the most recent agent on the chat
                            //aka fix for transfers
                            name = chat.agents[chat.agents.length - 1].email.split('@')[0] || undefined;

                            if (topic.captains instanceof Array) {
                                topic.captains.forEach(function (cap) {
                                    if (name === cap) {
                                        delete wrapup.concurrent[name];
                                        name = undefined;
                                    }
                                });
                            }

                            if (typeof(name) !== 'string')
                                return false;

                            if (!(con.hasOwnProperty(name)))
                                con[name] = 0;

                            //sum up the number of active chats for each chatter
                            if (chat.pending)
                                con[name] += 1;

                        }
                    }
                });

                Object.keys(con).forEach(function (user) {

                    //log chat count for each chatter
                    if (!(wrapup.concurrent.hasOwnProperty(user))) {

                        wrapup.concurrent[user] = {
                            user: user,
                            current: con[user],
                            wrapup: false,
                            //start: new Date()
                        };

                    }

                    //update current chat count if different
                    else if (con[user] !== wrapup.concurrent[user].current)
                        wrapup.concurrent[user].current = con[user];

                    if (con[user] === 0) {
                        if (wrapup.concurrent.hasOwnProperty(user)) {
                            if (wrapup.concurrent[user].wrapup === false) {
                                delete wrapup.concurrent[user];
                                return true;
                            }
                        }
                    }

                });
            }
        })
        .catch(function (err) {
            console.error(err);
        });

    if (conf.ENV === 'dev')
        console.log(wrapup.concurrent);

    //loop through chatters
    Object.keys(wrapup.concurrent).forEach(function (chatter) {

        if (typeof(chatter) !== 'string')
            return false;

        var chatterobj = wrapup.concurrent[chatter];

        if (!(chatterobj instanceof Object)) {
            console.error('bad concurrent object');
            console.error('obj: ' + chatterobj);
            console.error('user: ' + chatter);
            return false;
        }

        //set wrapup status when at 2 chats or more
        if (chatterobj.current >= 2 && !chatterobj.wrapup) {

            if (conf.ENV === 'dev') {
                console.log('changed limit for: ' + chatterobj.user);
            }
            //log user out of the queue
            //requests.changeStatus(chatterobj.user, 'not accepting chats')
            requests.changeLimit(chatterobj.user, 1)
                .then(function () {
                    //set 'wrapup', but doesn't set the timer
                    wrapup.concurrent[chatter].wrapup = true;

                })
                .catch(function (err) {
                    console.error(err);
                });

        }

        //dropped down from 2, start timer
        else if (chatterobj.wrapup && chatterobj.current < 2 && !chatterobj.hasOwnProperty('start')) {

            if (conf.ENV === 'dev')
                console.log('timer start');

            wrapup.concurrent[chatter].start = new Date();
            return false;

        }

        //check timer, log in when wrapup is over
        else if (chatterobj.wrapup && chatterobj.current < 2 && chatterobj.hasOwnProperty('start') && chatterobj.start instanceof Date) {

            //if wrapup time is over
            if (chatterobj.start.getTime() + conf_breaks.wrapupTime * 1000 < now.getTime()) {

                //if (conf.ENV === 'dev')
                    console.log(new Date().toLocaleString() + ' wrapup over for: ' + chatterobj.user);

                //expire wrapup time and log back in
                //requests.changeStatus(chatterobj.user, 'accepting chats')
                requests.changeLimit(chatterobj.user, 2)
                    .then(function () {
                        wrapup.concurrent[chatter].wrapup = false;
                        delete wrapup.concurrent[chatter].start;

                        if (conf.ENV === 'dev')
                            console.log('wrapup success');
                    })
                    .catch(function (err) {
                        console.error(err);
                    });

                if (!(breaks.onbreak.hasOwnProperty(chatterobj.user) ||
                    breaks.overbreak.hasOwnProperty(chatterobj.user) ||
                    breaks.out.hasOwnProperty(chatterobj.user) ||
                    breaks.lunch.hasOwnProperty(chatterobj.user) ||
                    breaks.bio.hasOwnProperty(chatterobj.user))) {

                    console.log(new Date().toLocaleString() + ' not on break, logging out: ' + chatterobj.user);

                    requests.changeStatus(chatterobj.user, 'not accepting chats')
                        .then(function () {
                            requests.changeStatus(chatterobj.user, 'accepting chats')
                                .then(function () {
                                    //if (conf.ENV === 'dev')
                                        console.log(new Date().toLocaleString() + ' logged in: ' + chatterobj.user);
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
            }
        }

        //else
            //console.log('no wrapup yet: ' + chatterobj);

    });
}