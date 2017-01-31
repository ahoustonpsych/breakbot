
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
    var lunch_list = '*Lunch times:* ';

    var that = this;

    if (Object.keys(this.schedule).length !== 0)
        Object.keys(this.schedule).forEach(function (user) {

            hour = that.schedule[user].time.getHours();
            minute = that.schedule[user].time.getMinutes();

            if (minute.toString().length < 2)
                minute = '0' + minute;

            lunch_list = lunch_list + user + ' (' + hour + ':' + minute + '), ';

        });

    else {
        return false;
    }

    lunch_list = lunch_list.replace(/, $/, '');

    return lunch_list;
}