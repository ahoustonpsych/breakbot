let slack = require('../../lib/slack').rtm;
let topic = require('../topic');

let globals = require('../../conf/config.globals');

module.exports = {
    expr: /^(!add)|(breakbot:? add)/i,
    run: add
};

/*
 * Add user or a list of users to the channel topic
 */
function add(data) {

    /* try to parse the arg if given. if it can't, defaults to the user that sent the message*/
    let arg = data.text.split(' ')
        .map(function (el) {
            el = topic.removeSpecial(el);
            if (el.match(/^me$/i))
                return slack.getUser(data.user).name;
            else
                return slack.getUser(el).name;
        });

    if (arg instanceof Array)
        if (arg.length === 0)
            arg = [slack.getUser(data.user).name];

    topic.setTopic(data, globals.channels[data.name].topic + ' ' + arg.join(' '));

    console.log(new Date().toLocaleString() + ' ADD: updated topic in ' + data.name + ': ' + globals.channels[data.name].topic)
}