
let Promise = require('promise');
let slack = require('../lib/slack').rtm;
let globals = require('../conf/config.globals');
let conf_breaks = require('../conf/config.breaks');

module.exports = {
    addLunch: addLunch,
    clearLunch: clearLunch,
    isScheduled: isScheduled,
    listLunch: listLunch
};

function addLunch(user, time, channel) {
    return new Promise(function (fulfill, reject) {
        if (!(globals.channels.hasOwnProperty(channel))) {
            console.error(new Date().toLocaleString() + ' NO SCHEDULE: ' + Object.keys(globals.channels));
            reject();
        }

        let schedule = globals.channels[channel].schedule;

        /* create new lunch slot if necessary */
        if (!schedule.hasOwnProperty(time))
            schedule[time] = [];

        /* reject if the desired lunch slot is already full */
        if (schedule[time].length >= conf_breaks.maxLunchSlot) {
            reject('err: slot full');
            return false;
        }

        isScheduled(user, channel)
            .then((err) => {
                reject('err: already scheduled');
                return false;
            })
            .catch((res) => {
                schedule[time].push({
                    name: user,
                    time: time,
                    notified: 0
                });
                fulfill();
            });


        // console.log('SCHEDULE: ');
        // console.log(schedule);

    });
}

function clearLunch(user, channel) {
    return new Promise(function (fulfill, reject) {

        isScheduled(user, channel)
            .then(() => {})
            .catch((err) => reject('not scheduled'));

        let schedule = globals.channels[channel].schedule;

        //TODO
        //runs twice in my tests, need to fix that
        //seems fine live though. results in a schedule list like this: [ null ]
        Object.keys(schedule).forEach((slot) => {
            Object.keys(schedule[slot]).forEach(function (userIdx) {
                if (schedule[slot][userIdx].name === user) {
                    console.log(new Date().toLocaleString() + ' removed scheduled lunch for ' + user);
                    delete schedule[slot][userIdx];
                    fulfill('removed lunch time');
                }
            })
        });
    });
}

/*
 * Returns true if the user is already schedule for lunch
 */
function isScheduled(name, channel) {
    return new Promise(function (fulfill, reject) {
        let schedule = globals.channels[channel].schedule;

        Object.keys(schedule).forEach((slot) => {
            Object.keys(schedule[slot]).forEach((userIdx) => {
                if (schedule[slot][userIdx].name === name) {
                    fulfill('is scheduled');
                }
            });
        });

        reject('not scheduled');
    });
}

/*
 * Returns a sorted list of scheduled lunches
 */
function listLunch(channel) {
    if (!(globals.channels.hasOwnProperty(channel)))
        return false;

    let list = [],
        schedule = globals.channels[channel].schedule,
        lunch_list = '*Lunch times:* ';

    //return if nobody is scheduled
    if (Object.keys(schedule).length === 0)
        return false;

    /* build list of lunch schedules */
    Object.keys(schedule).forEach((time) => {
        schedule[time].forEach((user) => {
            list.push({
                user: user.name,
                time: user.time
            });
        });
    });

    /* sort lunch schedule by time */
    list = list.sort(function (first, second) {
        //sorts by lunch time
        return (new Date(first.time)).getTime() - (new Date(second.time)).getTime();
    });

    /* parse each scheduled time into human-readable format (e.g. 12:00, 1:00, etc. */
    while (list.length > 0) {
        let user = list.shift();

        hour = user.time.getHours();
        minute = user.time.getMinutes();

        if (minute.toString().length < 2)
            minute = '0' + minute;

        lunch_list = lunch_list + user.user + ' (' + hour + ':' + minute + '), ';
    }

    lunch_list = lunch_list.replace(/, $/, '');

    return lunch_list;
}