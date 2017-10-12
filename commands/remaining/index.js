let slack = require('../../lib/slack').rtm;

let conf_breaks = require('../../conf/config.breaks');
let globals = require('../../conf/config.globals');

module.exports = {
    expr: /^(!remaining)|(breakbot:? remaining)/i,
    run: remaining
};

function remaining(data) {

    if (!globals.channels.hasOwnProperty(data.name))
        return false;

    let breaksLeft = conf_breaks.maxDailyBreaks - globals.channels[data.name].breaks.count[data.username] || conf_breaks.maxDailyBreaks;

    slack.sendMessage('breaks remaining: ' + breaksLeft, data.channel);

}