let slack = require('../../lib/slack').rtm;
let topic = require('../topic');

let globals = require('../../conf/config.globals');

let offs = {'!add': 1, 'breakbot': 2};

module.exports = {
    expr: /^(!add)|(breakbot:? add)/i,
    run: add
};

function add(data) {

    if (data.text.split(' ')[0].match(/!add/i) !== null)
        off = offs['!add'];
    else
        off = offs['breakbot'];

    /* try to parse the arg if given. if it can't, defaults to the user that sent the message*/
    let arg = data.text.split(' ')
        .slice(off)
        .map(function (el) {
            el = topic.removeSpecial(el);
            console.log(el)
            if (el.match(/^me$/i))
                return slack.getUser(data.user).name;
            else
                return slack.getUser(el).name;
        });

    if (arg instanceof Array)
        if (arg.length === 0)
            arg = [slack.dataStore.getUserById(data.user).name];

    // topic.setTopic(data.channel, topic.topic + ' ' + arg.join(' '));
    topic.setTopic(data, globals.channels[data.name].topic + ' ' + arg.join(' '));
}