var slack = require('../../lib/slack').rtm;

module.exports = {
    expr: /^(!restart)|(breakbot:? restart)/i,
    run: restart
};

function restart(data) {
    slack.sendMessage('Restarting...', data.channel);

    process.nextTick(function () {
        process.exit();
    });
}