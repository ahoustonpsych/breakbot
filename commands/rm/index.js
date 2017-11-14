let slack = require('../../lib/slack').rtm;

let topic = require('../topic');

let globals = require('../../conf/config.globals');

/* argument offsets, used to allow multi-word commands */
let offs = {'!rm': 1, 'breakbot': 2};

module.exports = {
    expr: /^(!rm)|(breakbot:? rm)/i,
    run: rm
};

function rm(data) {
    let oldtopic = globals.channels[data.name].topic;

    // if (data.text.split(' ')[0].match(/!rm/i) !== null)
    //     off = offs['!rm'];
    // else
    //     off = offs['breakbot'];

    /* try to parse the args if given. if it can't, defaults to the user that sent the message */
    let arg = data.text.split(' ')
        //.slice(off)
        .map(function (el) {

            el = topic.removeSpecial(el);

            if (el.match(/^me$/i) !== null || el === '')
                return slack.getUser(data.user).name;
            else
                return slack.getUser(el).name;

        });

    /* no arg given, default to the user who sent the message */
    if (arg instanceof Array)
        if (arg.length === 0)
            arg = [slack.getUser(data.user).name];

    /* remove user(s) from topic */
    replaceChatter(oldtopic, arg, function (newtopic) {
        //callback
        if (!(newtopic instanceof Array))
            topic.setTopic(data, newtopic);
        else
            slack.sendMessage('not in topic: ' + newtopic.join(' '), data.channel);

    });
}

/* top: current topic
 * arg: list of people to remove from the topic
 */
function replaceChatter(top, arg, callback) {

    let re = '';
    /* array of users not in topic */
    let notintopic = [];

    arg.forEach(function (el) {

        /* searches for a name in the topic and removes it */
        if (top.match(new RegExp(el, 'gi')) !== null) {
            re = new RegExp('(,|, | |^)' + el, 'gi');
            top = top.replace(re, '');
        }

        /* take note if a user provided isn't in the topic */
        else
            notintopic.push(el);

    });

    /* if none of the users provided are in the topic, then don't update it */
    if (notintopic.length >= arg.length)
        callback(notintopic);

    else
        callback(top);

}