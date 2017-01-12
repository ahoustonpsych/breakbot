var slack = require('../../lib/slack').rtm;
var breaks = require('../breaks');

module.exports = {
    expr: /^(!list)|(breakbot:? list)/i,
    run: list
};

function list(data) {

    var onbreak_list = '*On break:* ';
    var lunch_list = '*On lunch:* ';
    var bio_list = '*Bathroom:* ';

    /* populates list of users currently on break, paired with the amount of time left on their break */
    if (Object.keys(breaks.onbreak).length !== 0)
        Object.keys(breaks.onbreak).forEach(function (user) {
            onbreak_list = onbreak_list + user + ' (' + breaks.onbreak[user].remaining + 'm), ';
        });

    if (Object.keys(breaks.lunch).length !== 0)
        Object.keys(breaks.lunch).forEach(function (user) {
            lunch_list = lunch_list + user + ' (' + breaks.lunch[user].remaining + 'm), ';
        });

    if (Object.keys(breaks.bio).length !== 0)
        Object.keys(breaks.bio).forEach(function (user) {
            bio_list = bio_list + user + ' (' + breaks.bio[user].remaining + 'm), ';
        });

    /* strips trailing comma from the list */
    onbreak_list = onbreak_list.replace(/, $/, '');
    lunch_list = lunch_list.replace(/, $/, '');

    if (Object.keys(breaks.onbreak).length !== 0 ||
        Object.keys(breaks.overbreak).length !== 0 ||
        Object.keys(breaks.out).length !== 0 ||
        Object.keys(breaks.lunch).length !== 0 ||
        Object.keys(breaks.bio).length !== 0) {

        slack.sendMessage(onbreak_list + '\n' +
            '*Over break:* ' + Object.keys(breaks.overbreak).join(', ') + '\n' +
            '*Out:* ' + Object.keys(breaks.out).join(', ') + '\n' +
            lunch_list + '\n' +
            bio_list, data.channel);
    }
    else {
        slack.sendMessage('Nobody on break', data.channel);
    }
}