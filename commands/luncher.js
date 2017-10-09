
let slack = require('../lib/slack').rtm;
let globals = require('../conf/config.globals');

module.exports = {
    addLunch: addLunch,
    clearLunch: clearLunch,
    checkDupe: checkDupe,
    listLunch: listLunch
};

function addLunch(user, time, channel) {

    if (!(globals.hasOwnProperty(channel))) {
        console.log('NO SCHEDULE: ' + Object.keys(globals));
        return false;
    }

    let schedule = globals[channel].schedule;

    if (schedule.hasOwnProperty(user)) {
        console.log('ALREADY SCHEDULED: ' + Object.keys(globals[channel]));
        return false;
    }

    schedule[user] = {
        name: user,
        time: time,
        notified: 0
    };

    console.log('SCHEDULE: ');
    console.log(schedule[user]);

    return true;
}

function clearLunch(user, channel) {
    let schedule = globals[channel].schedule;

    if (schedule[user] instanceof Object) {
        delete schedule[user];
        return true;
    }

    else
        return false;

}

function checkDupe(time, channel) {
    let schedule = globals[channel].schedule;

    for (let user in schedule) {
        if ((schedule[user].time.getHours() === time.getHours()) && (schedule[user].time.getMinutes() === time.getMinutes())) {
            return false;
        }
    }

    return true;
}

function listLunch(channel) {

    //console.log(globals[channel].schedule)

    let list = [];

    let lunch_list = '*Lunch times:* ';

    if (!(globals.hasOwnProperty(channel)))
        return false;

    let schedule = globals[channel].schedule;

    // console.log('sched:')
    // console.log(schedule.length)

    //loop through lunch schedule to build a list
    if (Object.keys(schedule).length !== 0) {
        Object.keys(schedule).forEach(function (user) {

            // console.log('schedule: ' + Object.keys(globals[channel].schedule['ahouston']))
            // console.log('schedule: ' + schedule[user].name);
            //
            // console.log('time: ' + schedule[user].time);

            list.push({
                user: schedule[user].name,
                time: schedule[user].time
            });

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