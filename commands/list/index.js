var slack = require('../../lib/slack').rtm;
var breaks = require('../breaks');

module.exports = {
    expr: /^!list/,
    run: function (data) {
        list(data);
    }
};

function list(data) {

    if (Object.keys(breaks.onbreak).length != 0 ||
        Object.keys(breaks.overbreak).length != 0 ||
        Object.keys(breaks.out).length != 0) {

        slack.sendMessage("*On break:* " + Object.keys(breaks.onbreak).join(', ') + '\n'
            + "*Over break:* " + Object.keys(breaks.overbreak).join(', ') + '\n'
            + "*Out:* " + Object.keys(breaks.out).join(', '),
            data.channel);
    }
    else {
        slack.sendMessage("Nobody on break", data.channel);
    }
}