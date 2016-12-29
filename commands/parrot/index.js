var fs = require('fs');
var request = require('request');
var web = require('../../lib/slack').web;
var token = require('../../conf/config').slackAPIKey;

module.exports = {
    expr: /^(!parrot)|(breakbot:? parrot)/i,
    run: function (data) {
        parrot(data);
    }
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
        //if(res) console.log(res.body);
    })
}