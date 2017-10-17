
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
            console.log(new Date().toLocaleString() + ' NO SCHEDULE: ' + Object.keys(globals));
            return false;
        }

        let schedule = globals.channels[channel].schedule;

        if (!schedule.hasOwnProperty(time))
            schedule[time] = [];

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
        //seems fine live though
        Object.keys(schedule).forEach((slot) => {
            Object.keys(schedule[slot]).forEach(function (userIdx) {
                if (schedule[slot][userIdx].name === user) {
                    console.log(new Date().toLocaleString() + ' removed scheduled lunch for ' + user);
                    delete schedule[slot][userIdx];
                    fulfill('removed lunch time');
                }
            })
        });
        //delete globals.channels[channel].schedule[target[0]][target[1]];
        //fulfill('removed')

        //reject('lunch not found');
    });
}

function isScheduled(name, channel) {
    return new Promise(function (fulfill, reject) {
        let schedule = globals.channels[channel].schedule;

        Object.keys(schedule).forEach((slot) => {
            Object.keys(schedule[slot]).forEach((userIdx) => {
                if (schedule[slot][userIdx].name === name) {
                    //console.log('fail')
                    fulfill('is scheduled');
                }
            });
        });

        reject('not scheduled');
    });
}

function listLunch(channel) {

    //console.log(globals.channels[channel].schedule)

    let list = [];

    let lunch_list = '*Lunch times:* ';

    if (!(globals.channels.hasOwnProperty(channel)))
        return false;

    let schedule = globals.channels[channel].schedule;

    //loop through lunch schedule to build a list
    if (Object.keys(schedule).length !== 0) {
        Object.keys(schedule).forEach((time) => {
            schedule[time].forEach((user) => {
                list.push({
                    user: user.name,
                    time: user.time
                });
            });
            // console.log('schedule: ' + Object.keys(globals.channels[channel].schedule['ahouston']))
            // console.log('schedule: ' + schedule[user].name);
            //
            // console.log('time: ' + schedule[user].time);

        });
    }

    //return if nobody is scheduled for lunch
    else
        return false;

    list = list.sort(function (first, second) {
        //sorts by lunch time
        return (new Date(first.time)).getTime() - (new Date(second.time)).getTime();
    });

    //console.log(list.shift());

    while (list.length > 0) {

        //console.log(list);

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