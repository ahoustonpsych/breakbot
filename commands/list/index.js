var slack = require('../../lib/slack').rtm;
var breaks = require('../breaks');

module.exports = {
    expr: /^!list/,
    run: function (data) {
        list(data);
    }
};

function list(data) {
    var onbreak_list = '*On break:* ';

    /* populates list of users currently on break, paired with the amount of time left on their break */
    if(Object.keys(breaks.onbreak).length != 0)
        Object.keys(breaks.onbreak).forEach(function (user) {
            onbreak_list = onbreak_list + user + " (" + breaks.onbreak[user].remaining + "m), ";
        });

    /* strips trailing comma from the list */
    onbreak_list = onbreak_list.replace(/, $/, '');

    if (Object.keys(breaks.onbreak).length != 0 ||
        Object.keys(breaks.overbreak).length != 0 ||
        Object.keys(breaks.out).length != 0) {

        slack.sendMessage(onbreak_list + '\n' +
            "*Over break:* " + Object.keys(breaks.overbreak).join(', ') + '\n' +
            "*Out:* " + Object.keys(breaks.out).join(', '),
            data.channel);
    }
    else {
        slack.sendMessage("Nobody on break", data.channel);
    }
}