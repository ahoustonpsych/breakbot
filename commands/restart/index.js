var slack = require('../../lib/slack').rtm;
var db = require('../../lib/database');

var breaks = require('../breaks');

module.exports = {
    expr: /^(!restart)|(breakbot:? restart)/i,
    run: restart,
};

function restart(data) {

    breaks.saveBreaks()
        .then(function () {

            console.log('saved breaks successfully');

            var logdata = {
                username: slack.dataStore.getUserById(data.user).name,
                command: '!restart',
                date: 'now'
            };

            slack.sendMessage('Restarting...', data.channel);

            /* logging */
            db.log('command_history', logdata)
                .then(function () {

                    /* self-destruct one tick after logging */
                    process.nextTick(function () {
                        process.exit();
                    });

                })
                .catch(function (err) {
                    console.error('ERROR LOGGING COMMAND', err);
                });
        })
        .catch(function (err) {
            console.error(err);
        });
}