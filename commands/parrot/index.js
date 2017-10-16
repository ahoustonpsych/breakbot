let fs = require('fs');
let request = require('request');
let web = require('../../lib/slack').web;
let db = require('../../lib/database');
let slack = require('../../lib/slack').rtm;
let token = require('../../conf/config').slackAPIKey;

module.exports = {
    expr: /^(!parrot)|(breakbot:? parrot)/i,
    run: parrot
};

function parrot(data) {

    request.post({
        url: 'https://slack.com/api/files.upload',
        formData: {
            token: token,
            title: 'parrot',
            filename: 'parrot.gif',
            channels: data.channel,
            file: fs.createReadStream('lib/parrot.gif')
        }
    }, function (err, res) {
        if (err) console.error(err.body);
        else {
            let logdata = {
                username: slack.dataStore.getUserById(data.user).name,
                channel: data.name,
                date: 'now',
                command: '!parrot'
            };

            db.log('command_history', logdata)
                .catch(function (err) {
                    console.error('ERROR LOGGING COMMAND', err);
                });
        }

        //if(res) console.log(res.body);
    })
}