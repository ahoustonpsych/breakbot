let slack = require('../../lib/slack').rtm;

let conf_breaks = require('../../conf/config.breaks');
let globals = require('../../conf/config.globals');

module.exports = {
    expr: /^(!remaining)|(breakbot:? remaining)/i,
    run: remaining
};

function remaining(data) {

    if (!globals.hasOwnProperty(data.name))
        return false;

    let breaksLeft = conf_breaks.maxDailyBreaks - globals[data.name].breaks.count[data.username] || conf_breaks.maxDailyBreaks;

    slack.sendMessage('breaks remaining: ' + breaksLeft, data.channel);

}