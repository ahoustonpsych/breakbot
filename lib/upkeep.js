
let Promise = require('promise');

let slack = require('../lib/slack').rtm;

//const socket = require('../lib/wallboard');

let conf = require('../conf/config');
let conf_breaks = require('../conf/config.breaks');
let globals = require('../conf/config.globals');

let adp = require('./adp');

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
        console.log(new Date().toLocaleString() + ' NO CHANNELS YET');
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
        console.log(new Date().toLocaleString() + ' checking channels: ' + Object.keys(globals.channels).join(', '));

    // if (parseInt(process.uptime()) % 240 === 0)
    //     prepareBreaksForWallboard();

    for (let channel in globals.channels) {

        //currentChannel = globals.channels[channel];

        /* reject bad channel objects */
        if (!(globals.channels[channel] instanceof Object)) {
            console.error(new Date().toLocaleString() + ' ^ BAD CHANNEL OBJECT, SKIPPING:');
            console.error(globals.channels[channel]);
            continue;
        }

        upkeepCooldown(globals.channels[channel])
            .then(() => {
                /* process active breaks */
                Promise.all([
                    upkeepOnBreak(globals.channels[channel]),
                    upkeepTask(globals.channels[channel]),
                    upkeepBio(globals.channels[channel]),
                    upkeepLunch(globals.channels[channel])
                ])
                    .then((vals) => {
                        Promise.all([
                            upkeepOverBreak(globals.channels[channel]),
                            upkeepSchedule(globals.channels[channel])
                        ])
                            .then(() => {})
                            .catch((err) => console.error(new Date().toLocaleString() + ' ERROR WITH UPKEEP: ' + err));
                        //console.log('DONE PROCESSING UPKEEP FOR: ' + channel);
                    })
                    .catch((err) => {
                        console.error(new Date().toLocaleString() + ' ERROR WITH UPKEEP', err)
                    });
            })
            .catch((err) => console.error(new Date().toLocaleString() + ' UPKEEP FAILED: COOLDOWN', err));
    }
}

/* */
function upkeepCooldown(channel) {
    return new Promise(function (fulfill, reject) {
        if (!channel instanceof Object)
            reject(channel);

        let coolList = channel.breaks.cooldown;
        let now = new Date().getTime();

        Object.keys(coolList).forEach(user => {
            //timestamp verification
            if (typeof(coolList[user]) !== 'object') {
                coolList[user] = new Date(Date.parse(coolList[user]));
            }

            if (now > (coolList[user].getTime())) {
                delete coolList[user];
                fulfill();
                console.log(new Date().toLocaleString() + ' cooldown expired for: ' + user);
            }
        });

        fulfill();
    });
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

        Object.keys(breaks.over).forEach((user) => {

            /* removes user from being "on break" if it hasn't finished already */
            if (breaks.active[user] instanceof Object) {
                delete breaks.active[user];
                return false;
            }
            else if (breaks.lunch[user] instanceof Object) {
                delete breaks.lunch[user];
                return false;
            }

            let delta = (now - (breaks.over[user].outTime + (breaks.over[user].duration * 1000))) / 1000;

            //TODO
            //add delta to overbreak object

            /* send reminder every conf_breaks.remindTime seconds */
            if (parseInt(delta) > 0 && parseInt(delta) % conf_breaks.remindTime === 0) {
                sendReminder(user, channel, parseInt(delta / 60));
            }
        });

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
function upkeepSchedule(channel) {
    return new Promise(function (fulfill, reject) {

        if (!(channel.hasOwnProperty('schedule'))) {
            console.error(channel);
            reject('^ BAD CHANNEL OBJECT, SKIPPING');
        }

        let now = new Date();

        //check lunch schedules
        Object.keys(channel.schedule).forEach((slot) => {
            Object.keys(channel.schedule[slot]).forEach((userIdx) => {
                userSlot = channel.schedule[slot][userIdx];

                //delete empty lunch slots
                if (userSlot === null) delete channel.schedule[slot][userIdx];

                if (!(userSlot.time instanceof Date)) {
                    console.error(new Date().toLocaleString() + ' INVALID LUNCH TIME, SKIPPING:');
                    console.error(userSlot);
                    delete /* userSlot */ channel.schedule[slot][userIdx];
                    return;
                }

                let userId = slack.getUser(userSlot.name).id;

                //send reminder 15 minutes prior to lunch time
                if (!userSlot.notified && (userSlot.time - 15 * 60 * 1000) <= now) {
                    slack.sendPrivateMessage(userSlot.name + ': get ready, lunch in 15!', userId);
                    userSlot.notified = 1;
                }

                //send reminder when lunch time rolls around
                else if ((userSlot.notified === 1)
                    && (userSlot.time.getHours() % 12) === (now.getHours() % 12)
                    && (userSlot.time.getMinutes() === now.getMinutes())) {
                    slack.sendPrivateMessage(userSlot.name + ': time for lunch! Use *!lunch* when you\'re ready!', userId);
                    userSlot.notified = 2;
                }

                //expire old lunches
                if (userSlot.time.getTime() + conf_breaks.lunchExpire * 60 * 1000 <= now.getTime()) {
                    console.log(new Date().toLocaleString() + ' lunch expired: ' + userSlot.name + ', ' + userSlot.time);
                    delete /* userSlot */ channel.schedule[slot][userIdx];
                }
            });
        });

        fulfill();
    });
}

/*
 * processes users whose break just expired. sends notification privately
 */
function breakExpired(user, list, channel) {

    let breaks = channel.breaks;
    let userID = slack.getUser(user).id;

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

    let userID = slack.getUser(user).id;

    slack.sendPrivateMessage(user + ': you need to log back into #' + channel.name + ' with *!back*', userID);

    notifySupers('`' + user + '`' + ' is *' + timeOver + 'm* over their break.');

}

/*
 * pings all supervisors when someone is >2m over their break
 */
function notifySupers(msg) {

    //let list = ['mrathbun', 'bcleveland', 'dsinger', 'jankney'];
    //let list = ['mrathbun', 'bcleveland', 'dsinger']
    let list = globals.channels[conf.channelDesignation['support']].supervisors;

    //let list = ['ahouston'];

    list.forEach((supervisor) => {
        console.log(supervisor.name);
        //TODO
        //slack.sendPrivateMessage(msg, slack.getUser(supervisor).id);
    });
}

/* clear all break limits daily */
function clearBreakLimits() {
    for (let channel in globals.channels) {
        globals.channels[channel].breaks.count = {};
    }
}

function prepareBreaksForWallboard() {

    //let data = JSON.parse(JSON.stringify(globals.channels));
    let data = {};

    Object.keys(globals.channels).forEach(channel => {
        data[channel] = {
            breaks: globals.channels[channel].breaks,
            schedule: globals.channels[channel].schedule
        }
    });

    socket.emit('data.set', {'support.breaks_data': data});

    console.log(data)

    // Object.keys(data).forEach(channel => {
    //     delete data[channel].name;
    //     delete data[channel].id;
    //     delete data[channel].topic;
    //     delete data[channel].punchCount;
    //     delete data[channel].maxOnBreak;
    //     delete data[channel].supervisors;
    // })

}