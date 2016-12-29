var web = require('../../lib/slack').web;
var requests = require('../lc_requests');
var slack = require('../../lib/slack').rtm;
var topic = require('../topic');

var offs = {'!test': 1, 'breakbot': 2};

module.exports = {
    expr: /^!test/,
    run: function (data) {
        topic.getCaptain();
        //topic.setTopic(data.channel, '*Chat Captain:* agorzen *Chatters:*  aengler amayers blangenberg bsmith dhultin eanderson jzimmer ndumond skorber wgray');
        console.log('captain: ' + topic.captain);

        //web.channels.info(data.channel)
        //	.then(function (info) { console.log(info); });


        /*
         requests.getLCStatus(function (status) {
         console.log(status);
         });

         var user = slack.dataStore.getUserById(data.user).name;
         var arg = data.text.split(' ')[1];

         var username = arg !== undefined ? arg : user;

         //list of agents accepting chats
         requests.getAgents('accepting chats', function (resp) {
         console.log('accepting:');
         resp.forEach(function (user) {
         //console.log(user.login);
         });
         });

         //list of agents not accepting chats
         requests.getAgents('not accepting chats', function (resp) {
         console.log('not accepting:');
         resp.forEach(function (user) {
         //console.log(user.login);
         });
         });

         //adds user to topic
         topic.setTopic(data.channel, topic.topic + ', ' + username);

         //topic.setTopic(data.channel,)
         //web.groups.setTopic(data.channel, 'test1');

         //slack.sendMessage('/topic test1', data.channel);
         */
    }
};