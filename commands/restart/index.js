var slack = require('../../lib/slack').rtm;
var db = require('../../lib/database');

module.exports = {
    expr: /^(!restart)|(breakbot:? restart)/i,
    run: restart
};

function restart(data) {

    var logdata = {
        username: slack.dataStore.getUserById(data.user).name,
        command: '!restart',
        date: 'now'
    };

    slack.sendMessage('Restarting...', data.channel);

    /* logging */
    db.log('command_history', logdata)
        .then(function () {
            /* self-destruct one ticket after logging */
            process.nextTick(function () {
                process.exit();
            });
        })
        .catch(function (err) {
            console.error('ERROR LOGGING COMMAND', err);
        });
}