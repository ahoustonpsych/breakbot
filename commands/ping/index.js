let slack = require('../../lib/slack').rtm;

let breaks = require('../breaks');
let topic = require('../topic');
let globals = require('../../conf/config.globals');

module.exports = {
    expr: /(!ping)|(breakbot:? ping)/i,
    run: ping
};

/*
 * pings all chatters in topic
 */
function ping(data) {
    slack.sendMessage('^^ ' + topic.getChatters(data.name).join(' '), data.channel)
}