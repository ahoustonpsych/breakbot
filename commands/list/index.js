var slack = require('../../lib/slack');
var breaks = require('../breaks');

module.exports = {
    expr: /^!list/,
    run: function (data) {
        list(data);
    }
};

function list(data) {
    //console.log(Object.keys(breaks.onbreak).length);
    //console.log(Object.keys(breaks.overbreak).length);
    //console.log(breaks.out);

    if (Object.keys(breaks.onbreak).length != 0 ||
        Object.keys(breaks.overbreak).length != 0 ||
        Object.keys(breaks.out).length != 0) {

        slack.sendMessage("On break: " +
            Object.keys(breaks.onbreak).join(', ') +
            Object.keys(breaks.overbreak).join(', ') +
            Object.keys(breaks.out).join(', '),
            data.channel);
    }
    else {
        slack.sendMessage("Nobody on break", data.channel);
    }
}