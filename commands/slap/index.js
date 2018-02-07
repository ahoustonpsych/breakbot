let slack = require('../../lib/slack').rtm,
    db = require('../../lib/database');

module.exports = {
    expr: /^!slap/i,
    run: slap
};

function slap(data) {
    let victim = data.text.split(' ')[0] || data.username;

    if (victim.toLowerCase() === 'breakbot' || victim === '<@U2KASR2FN>')
        victim = data.username;

    slack.sendMessage('_slapped ' + victim + ' around a bit with a large trout_', data.channel);

    let logdata = {
        username: slack.dataStore.getUserById(data.user).name,
        channel: data.name,
        date: 'now',
        command: '!slap ' + victim
    };

    console.log(logdata);

    db.log('command_history', logdata)
        .catch(function (err) {
            console.error(new Date().toLocaleString() + ' ERROR LOGGING COMMAND', err);
        });

    return;
}