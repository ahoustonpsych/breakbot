var slack = require('../../lib/slack').rtm;

var topic = require('../topic');

/* argument offsets, used to allow multi-word commands */
var offs = {'!rm': 1, 'breakbot': 2};

module.exports = {
    expr: /^(!rm)|(breakbot:? rm)/i,
    run: rm
};

function rm(data) {
    var newtopic = topic.topic;

    if (data.text.split(' ')[0].match(/!rm/i) !== null)
        off = offs['!rm'];
    else
        off = offs['breakbot'];

    var arg = data.text.split(' ')
        .slice(off)
        .map(function (el) {
            if (el.match(/^me$/i) !== null)
                return slack.dataStore.getUserById(data.user).name;
            else
                return el;
        });

    if (arg.length === 0)
        arg = [slack.dataStore.getUserById(data.user).name];

    replaceChatter(newtopic, arg, function (top) {
        topic.setTopic(data.channel, top);
    });
}

function replaceChatter(top, arg, callback) {
    var re = '';
    arg.forEach(function (el) {
        re = new RegExp('(,|, | )' + el, 'g');
        if (top.indexOf(el) !== null)
            top = top.replace(re, '');
    });
    callback(top);
}