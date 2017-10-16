
let Promise = require('promise');
let slack = require('../lib/slack').rtm;
let globals = require('../conf/config.globals');

module.exports = {
    addLunch: addLunch,
    clearLunch: clearLunch,
    isScheduled: isScheduled,
    listLunch: listLunch
};

function addLunch(user, time, channel) {
    return new Promise(function (fulfill, reject) {
        if (!(globals.channels.hasOwnProperty(channel))) {
            console.log('NO SCHEDULE: ' + Object.keys(globals));
            return false;
        }

        let schedule = globals.channels[channel].schedule;

        // if (schedule.hasOwnProperty(time)) {
        //     if (schedule[time])
        //     console.log('ALREADY SCHEDULED: ' + Object.keys(globals.channels[channel]));
        //     return false;
        // }

        // if (Object.keys(schedule[time]) === 4) {
        //     console.log('slot full')
        //     return;
        //}

        //TODO
        //really need to fix this

        if (!schedule.hasOwnProperty(time))
            schedule[time] = [];

        if (schedule[time].length >= 4) {
            reject('err: slot full');
            return false;
        }

        isScheduled(user, channel)
            .then((res) => {
                schedule[time].push({
                    name: user,
                    time: time,
                    notified: 0
                });
                fulfill();
            })
            .catch((err) => {
                reject('err: already scheduled');
                return false;
            });

        // if (isScheduled(user, channel)) {
        //     reject('err: already scheduled');
        // }



        // schedule[time].push({
        //     name: user,
        //     time: time,
        //     notified: 0
        // });

        //fulfill();

        // schedule[user] = {
        //     name: user,
        //     time: time,
        //     notified: 0
        // };

        // console.log('SCHEDULE: ');
        // console.log(schedule);

    });
}

function clearLunch(user, channel) {
    return new Promise(function (fulfill, reject) {
        let schedule = globals.channels[channel].schedule;

        Object.keys(schedule).forEach((slot) => {
            Object.keys(schedule[slot]).forEach((userIdx) => {
                if (schedule[slot][userIdx].name === user) {
                    delete schedule[slot][userIdx];
                    console.log(new Date().toLocaleString() + ' removed schedule lunch for ' + user);
                    fulfill('removed lunch time');
                }
            })
        });

        reject('lunch not found');
    });
}

function isScheduled(name, channel) {
    return new Promise(function (fulfill, reject) {
        let schedule = globals.channels[channel].schedule;

        Object.keys(schedule).forEach((slot) => {
            //console.log(schedule[slot])
            Object.keys(schedule[slot]).forEach((userIdx) => {
                //console.log(schedule[slot][userIdx])
                if (schedule[slot][userIdx].name === name) {
                    //console.log('fail')
                    reject('is scheduled');
                }
            });
        });

        fulfill('not scheduled');
    });
}

function listLunch(channel) {

    //console.log(globals.channels[channel].schedule)

    let list = [];

    let lunch_list = '*Lunch times:* ';

    if (!(globals.channels.hasOwnProperty(channel)))
        return false;

    let schedule = globals.channels[channel].schedule;

    // console.log('sched:')
    // console.log(schedule.length)

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

            //console.log(list);

        });
    }

    //return if nobody is scheduled for lunch
    else {
        return false;
    }

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