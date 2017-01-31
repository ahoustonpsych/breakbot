
var slack = require('../lib/slack').rtm;

var schedule = {};

module.exports = {
    schedule: schedule,
    addLunch: addLunch,
    clearLunch: clearLunch,
    checkDupe: checkDupe,
    listLunch: listLunch
};

function addLunch(user, time, channel) {

    if (!(this.schedule[user] instanceof Object)) {
        this.schedule[user] = {
            name: user,
            time: time,
            channel: channel,
            notified: 0
        };
        //console.log('time: ' + time);
        return true;
    }
    else
        return false;
}

function clearLunch(user) {

    if (this.schedule[user] instanceof Object) {
        delete this.schedule[user];
        return true;
    }
    else
        return false;

}

function checkDupe(time) {

    for (var user in this.schedule) {
        if ((this.schedule[user].time.getHours() === time.getHours()) && (this.schedule[user].time.getMinutes() === time.getMinutes())) {
            return false;
        }
    }

    return true;
}

function listLunch() {

    var list = [];

    var lunch_list = '*Lunch times:* ';

    var that = this;

    if (Object.keys(this.schedule).length !== 0) {
        Object.keys(this.schedule).forEach(function (user) {

            list.push({
                'user': that.schedule[user].name,
                'time': that.schedule[user].time
            });

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

        var user = list.shift();

        hour = user.time.getHours();
        minute = user.time.getMinutes();

        if (minute.toString().length < 2)
            minute = '0' + minute;

        lunch_list = lunch_list + user.user + ' (' + hour + ':' + minute + '), ';

    }

    lunch_list = lunch_list.replace(/, $/, '');

    return lunch_list;

}