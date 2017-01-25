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

    /* try to parse the args if given. if it can't, defaults to the user that sent the message */
    var arg = data.text.split(' ')
        .slice(off)
        .map(function (el) {
            el = topic.removeSpecial(el);
            if (el.match(/^me$/i) !== null || el === '')
                return slack.dataStore.getUserById(data.user).name;
            else
                return el;
        });

    if (arg instanceof Array)
        if (arg.length === 0)
            arg = [slack.dataStore.getUserById(data.user).name];

    replaceChatter(newtopic, arg, function (top) {
        topic.setTopic(data.channel, top);
    });
}

/* top: current topic
 * arg: list of people to remove from the topic
 */
function replaceChatter(top, arg, callback) {
    var re = '';

    arg.forEach(function (el) {

        /* searches for a name in the topic and removes it if found */
        if (top.match(new RegExp(el, 'gi')) !== null) {
            re = new RegExp('(,|, | )' + el, 'gi');
            top = top.replace(re, '');
        }

    });

    callback(top);

}