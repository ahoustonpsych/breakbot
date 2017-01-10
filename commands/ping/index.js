var slack = require('../../lib/slack').rtm;
var breaks = require('../breaks');
var topic = require('../topic');

module.exports = {
    expr: /(!ping)|(breakbot:? ping)/i,
    run: ping
};

/*
 * pings all chatters in topic
 */
function ping(data) {
    slack.sendMessage('^^ ' + topic.getChatters().join(' '), data.channel)
}