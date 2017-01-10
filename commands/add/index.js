var slack = require('../../lib/slack').rtm;
var topic = require('../topic');

module.exports = {
    expr: /^(!add)|(breakbot:? add)/i,
    run: add
};

function add(data) {

    if (data.text.split(' ')[0].match(/!add/i) !== null)
        off = offs['!add'];
    else
        off = offs['breakbot'];

    var arg = data.text.split(' ')
        .slice(off)
        .map(function (el) {
            if (el.match(/^me$/i))
                return slack.dataStore.getUserById(data.user).name;
            else
                return el;
        });

    if (arg instanceof Array)
        if (arg.length === 0)
            arg = [slack.dataStore.getUserById(data.user).name];

    topic.setTopic(data.channel, topic.topic + ' ' + arg.join(' '));
}