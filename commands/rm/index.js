let slack = require('../../lib/slack').rtm;

let topic = require('../topic');

let globals = require('../../conf/config.globals');

module.exports = {
    expr: /^(!rm)|(breakbot:? rm)/i,
    run: rm
};

/*
 * Remove user or a list of users from the channel topic
 */
function rm(data) {
    let oldtopic = globals.channels[data.name].topic;

    /* try to parse the args if given. if it can't, defaults to the user that sent the message */
    let arg = data.text.split(' ')
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
    replaceChatter(oldtopic, arg)
        .then((newtopic) => {
            topic.setTopic(data, newtopic);
        })
        .catch((absentUsers) => {
            if (!absentUsers instanceof Array) return;
            slack.sendMessage('not in topic: ' + absentUsers.join(' '), data.channel);
        });
}

/* top: current topic
 * arg: list of people to remove from the topic
 */
function replaceChatter(top, arg) {
    return new Promise((fulfill,reject) => {

        let re = '',
            notInTopic = [];

        arg.forEach(function (el) {
            let elId = slack.getUser(el).id;

            /* searches for a name or user ID in the topic and removes it */
            if (top.match(new RegExp(el, 'gi')) || top.match(new RegExp(elId, 'gi'))) {
                re = new RegExp('(,|, | |^)' + el, 'gi');
                reId = new RegExp('<@' + elId + '>', 'gi');
                top = top.replace(re, '');
                top = top.replace(reId, '');
            }

            /* take note if a user provided isn't in the topic */
            else
                notInTopic.push(el);

        });

        /* if none of the users provided are in the topic, then don't update it */
        if (notInTopic.length >= arg.length)
            reject(notInTopic);
        else
            fulfill(top);
    });
}