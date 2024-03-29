let slack = require('../../lib/slack').rtm;
let db = require('../../lib/database');

let breaks = require('../breaks');
let wrapup = require('../wrapup');

module.exports = {
    expr: /^(!restart)|(breakbot:? restart)/i,
    run: restart,
};

function restart(data) {

    breaks.saveBreaks()
        .then(function () {

            console.log(new Date().toLocaleString() + ' saved breaks successfully');

            slack.sendMessage('Restarting...', data.channel);

            let logdata = {
                username: slack.dataStore.getUserById(data.user).name,
                channel: data.name,
                command: '!restart',
                date: 'now'
            };

            /* logging */
            db.log('command_history', logdata)
                .then(function () {

                    /* self-destruct one tick after logging */
                    process.nextTick(function () {
                        process.exit();
                    });

                })
                .catch(function (err) {
                    console.error(new Date().toLocaleString() + ' ERROR LOGGING COMMAND', err);
                });
        })
        .catch(function (data) {
            console.error(new Date().toLocaleString() + ' invalid break data:');
            console.error(data);
        });
}