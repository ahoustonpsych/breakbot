
let Promise = require('promise');

let slack = require('../lib/slack').rtm;

let conf = require('../conf/config');
let conf_breaks = require('../conf/config.breaks');
let globals = require('../conf/config.globals');

let adp = require('./adp');

//var requests = require('../commands/lc_requests');
//var breaks = require('../commands/breaks');
//var wrapup = require('../commands/wrapup');
let luncher = require('../commands/luncher');
let topic = require('../commands/topic');

let db = require('./database');


module.exports = {
    upkeep: upkeep
};

/* runs every second */
function upkeep() {

    //fail if channel objects haven't been created yet
    if (Object.keys(globals).length === 0) {
        console.log('NO CHANNELS YET');
        return false;
    }

    //console.log(parseInt(process.uptime()))

    if (parseInt(process.uptime()) % 600 === 0) {
        adp.getPunchedIn();
    }

    /* clear break limits daily, at 11 pm */
    if ((parseInt(process.uptime() % 60) === 0) && (new Date().getHours() === 23) && (new Date().getMinutes() === 0)) {
        console.log(new Date().toLocaleString() + ' clearing daily break limits');
        clearBreakLimits();
    }

    //repeat once per minute
    if (parseInt(process.uptime()) % 300 === 0)
        console.log(new Date().toLocaleString() + ' checking channels: ' + Object.keys(globals).join(', '));

    for (let channel in globals) {

        /* reject bad channel objects */
        if (!(globals[channel] instanceof Object)) {
            console.error('^ BAD CHANNEL OBJECT, SKIPPING:');
            console.error(globals[channel]);
            continue;
        }

        /* process active breaks */
        Promise.all([
            upkeepOnBreak(globals[channel]),
            upkeepTask(globals[channel]),
            upkeepBio(globals[channel]),
            upkeepLunch(globals[channel])
        ])
            .then(function (vals) {
                upkeepOverBreak(globals[channel]);
                checkLunch(globals[channel]);
                //console.log('DONE PROCESSING UPKEEP FOR: ' + channel);
            })
            .catch(function (err) {
                console.error('ERROR WITH UPKEEP', err)
            });
    }
}

/*
 * checks if anyone's break has expired in any channel
 * notifies the user and moves them to "over break" if so
 */
function upkeepOnBreak(channel) {
    return new Promise(function (fulfill, reject) {

        if (!(channel.hasOwnProperty('breaks'))) {
            console.error(channel);
            reject('^ NO BREAKS IN CHANNEL OBJECT');
        }

        let now = new Date().getTime();
        let breaks = channel.breaks;

        /* current users on break */
        for (let user in breaks.active) {

            if (conf.ENV === 'test') {
                console.log('user: ' + user);
                console.log('now: ' + now);
                console.log('outTime: ' + breaks.active[user].outTime);
                console.log('duration: ' + breaks.active[user].duration);
                console.log('channel: ' + breaks.active[user].channel);
                console.log('remaining: ' + breaks.active[user].remaining);
            }

            /* minutes remaining in break */
            breaks.active[user].remaining = Math.floor(Math.abs((now - (breaks.active[user].outTime + (breaks.active[user].duration * 60 * 1000))) / 60000));

            /* now - (time of break + duration of break) in seconds */
            //debug. time until break expires
            let delta = (now - (breaks.active[user].outTime + (breaks.active[user].duration * 60 * 1000))) / 60000;

            /* break expired */
            if (delta > 0) {
                breakExpired(user, breaks.active, channel);
            }

            else if (conf.ENV === 'test')
                console.log(user + '\'s break expires in ' + delta + ' seconds.');
        }
        fulfill();
    });
}

function upkeepOverBreak(channel) {
    return new Promise(function (fulfill, reject) {

        if (!(channel.hasOwnProperty('breaks'))) {
            console.error(channel);
            reject('^ NO BREAKS IN CHANNEL OBJECT');
        }

        let now = new Date().getTime();
        let breaks = channel.breaks;

        for (let user in breaks.over) {

            /* removes user from being "on break" if it hasn't finished already */
            if (breaks.active[user] instanceof Object) {
                delete breaks.active[user];
                continue;
            }
            else if (breaks.lunch[user] instanceof Object) {
                delete breaks.lunch[user];
                continue;
            }

            let delta = (now - (breaks.over[user].outTime + (breaks.over[user].duration * 1000))) / 1000;

            //TODO
            //add delta to overbreak object

            /* send reminder every conf_breaks.remindTime seconds */
            if (parseInt(delta) > 0 && parseInt(delta) % conf_breaks.remindTime === 0) {
                sendReminder(user, channel, parseInt(delta / 60));
            }
        }

        fulfill();
    });
}

function upkeepTask(channel) {
    return new Promise(function (fulfill, reject) {

        if (!(channel.hasOwnProperty('breaks'))) {
            console.error(channel);
            reject('^ NO BREAKS IN CHANNEL OBJECT');
        }

        let now = new Date().getTime();
        let breaks = channel.breaks;

        for (let user in breaks.task) {

            /* expire users on task > 10 hours */
            if ((breaks.task[user] + 10 * 60 * 60 * 1000) < now) {
                delete breaks.task[user];
                continue;
            }

            /* minutes remaining in break */
            breaks.task[user].remaining =
                Math.floor(Math.abs((now - (breaks.task[user].outTime + (breaks.task[user].duration * 60 * 1000))) / 60000));

            /* now - (time of break + duration of break) in seconds */

            let delta = (now - (breaks.task[user].outTime + (breaks.task[user].duration * 60 * 1000))) / 60000;

            /* break expired */
            if (delta > 0) {
                breakExpired(user, breaks.task, channel);
            }

            //debug. time until break expires
            else if (conf.ENV === 'test')
                console.log(user + '\'s break expires in ' + delta + ' seconds.');


            /* TODO
             * old code that checks if a user logged back in without the bot
             * going to have to rework this for SF if I want to keep it
             */
            // requests.getAgent(user)
            //     .then(function (res) {
            //
            //         status = res.status;
            //         user = res.login.split('@')[0];
            //
            //         /* checks if user already logged back in (or logged task altogether) */
            //         if (status === 'accepting chats' || status === 'offline') {
            //             delete breaks.task[user];
            //             console.log(new Date().toLocaleString() + ' ' + user + ' silently changed status to: ' + status + '. deleting break data. (FROM: upkeepOut)');
            //         }
            //         else {
            //             console.log(new Date().toLocaleString() + ' ' + user + ': ' + status + ' (FROM: upkeepOut)');
            //         }
            //
            //     })
            //     .catch(function (err) {
            //         console.error(err);
            //     });
        }

        fulfill();
    });
}

function upkeepLunch(channel) {
    return new Promise(function (fulfill, reject) {

        if (!(channel.hasOwnProperty('breaks'))) {
            console.error(channel);
            reject('^ NO BREAKS IN CHANNEL OBJECT');
        }

        let now = new Date().getTime();
        let breaks = channel.breaks;

        /* current users on lunch */
        for (let user in breaks.lunch) {

            //debug
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
            let delta = (now - (breaks.lunch[user].outTime + (breaks.lunch[user].duration * 60 * 1000))) / 60000;

            /* break expired */
            if (delta > 0)
                breakExpired(user, breaks.lunch, channel);

            else if (conf.ENV === 'test')
                console.log(user + '\'s break expires in ' + delta + ' seconds.');
        }

        fulfill();
    });
}

function upkeepBio(channel) {
    return new Promise(function (fulfill, reject) {

        if (!(channel.hasOwnProperty('breaks'))) {
            console.error(channel);
            reject('^ NO BREAKS IN CHANNEL OBJECT');
        }

        let now = new Date().getTime();
        let breaks = channel.breaks;

        /* current users on lunch */
        for (let user in breaks.bio) {

            //debug
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
            let delta = (now - (breaks.bio[user].outTime + (breaks.bio[user].duration * 60 * 1000))) / 60000;

            /* break expired */
            if (delta > 0)
                breakExpired(user, breaks.bio, channel);

            else if (conf.ENV === 'test')
                console.log(user + '\'s break expires in ' + delta + ' seconds.');
        }

        fulfill();

    });
}

/*
 * verifies if lunches are coming up for each channel
 */
function checkLunch(channel) {
    return new Promise(function (fulfill, reject) {

        if (!(channel.hasOwnProperty('schedule'))) {
            console.error(channel);
            reject('^ BAD CHANNEL OBJECT, SKIPPING');
        }

        let now = new Date();

        //check lunch schedules
        for (let user in channel.schedule) {
            // console.log('checking:');
            // console.log(user);
            if (!(channel.schedule[user].time instanceof Date)) {
                console.error(new Date().toLocaleString() + ' INVALID LUNCH TIME, SKIPPING:');
                console.error(channel.schedule[user]);
                delete channel.schedule[user];
                continue;
            }

            let userId = slack.dataStore.getUserByName(user).id;

            //send reminder 15 minutes prior to lunch time
            if (!channel.schedule[user].notified && (channel.schedule[user].time - 16 * 60 * 1000) <= now) {
                slack.sendPrivateMessage(user + ': get ready, lunch in 15!', userId);
                channel.schedule[user].notified = 1;
            }

            //send reminder when lunch time rolls around
            else if ((channel.schedule[user].notified === 1)
                && (channel.schedule[user].time.getHours() % 12) === (now.getHours() % 12)
                && (channel.schedule[user].time.getMinutes() === now.getMinutes())) {
                slack.sendPrivateMessage(user + ': time for lunch! Use *!lunch* when you\'re ready!', userId);
                channel.schedule[user].notified = 2;
            }

            //expire old lunches
            if (channel.schedule[user].time.getTime() + conf_breaks.lunchExpire * 60 * 1000 <= now.getTime()) {
                console.log(new Date().toLocaleString() + ' lunch expired: ' + user + ', ' + channel.schedule[user].time);
                delete channel.schedule[user];
            }
        }
        fulfill();
    });
}

/*
 * processes users whose break just expired. sends notification privately
 */
function breakExpired(user, list, channel) {

    let breaks = channel.breaks;
    let userID = slack.dataStore.getUserByName(user).id;

    /* switches user from "on break" to "over break" */
    breaks.over[user] = JSON.parse(JSON.stringify(list[user]));

    slack.sendPrivateMessage(user + ': your break has expired. Log back into #' + channel.name + ' with *!back*', userID);

    delete list[user];

}

/*
 * sends private message reminding agent to log back in
 */
function sendReminder(user, channel, timeOver) {
    console.log(new Date().toLocaleString() + ' sending reminder to: ' + user);

    let userID = slack.dataStore.getUserByName(user).id;

    slack.sendPrivateMessage(user + ': you need to log back into #' + channel.name + ' with *!back*', userID);

    notifySupers('`' + user + '`' + ' is *' + timeOver + 'm* over their break.');

}

/*
 * pings all supervisors when someone is >2m over their break
 * TODO: integrate with ADP data
 */
function notifySupers(msg) {

    //let list = ['mrathbun', 'bcleveland', 'dsinger', 'jankney'];
    //let list = ['mrathbun', 'bcleveland', 'dsinger']
    let list = ['ahouston'];

    list.forEach((supervisor) => {
        slack.sendPrivateMessage(msg, slack.dataStore.getUserByName(supervisor).id);
    });

}

function clearBreakLimits() {
    for (let channel in globals) {
        globals[channel].breaks.count = {};
    }
}