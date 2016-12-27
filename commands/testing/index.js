var web = require('../../lib/slack').web;
var topic = require('../topic');
var slack = require('../../lib/slack').rtm;

var requests = require('../lc_requests');

module.exports = {
	expr: /^!test/,
	run: function(data) {
		topic.getCaptain();
        topic.setTopic(data.channel, "*Chat Captain:* agorzen *Chatters:*  aengler amayers blangenberg bsmith dhultin eanderson jzimmer ndumond skorber wgray");
        console.log("captain: " + topic.captain);
        /*
		requests.getChats()
			.then(function (data) {
				if (data instanceof Array) {
                    data.forEach(function (chat) {
                    	chat.events.forEach(function (event) {
                    		if(event.type == "event")
                    			if(event.text.match(/The chat was transferred to .+?(?=because)because .+?(?=had)had not replied for 1 minute\./) != null) {
                                    web.im.open(slack.dataStore.getUserByName("ahouston").id, function (err, res) {
                                    	if(err) console.error('invalid slack user', err);
                                    	else slack.sendMessage(event.date + ': ' + event.agent_id + ' bounced a chat', res.channel.id)
                                    });
                                }
						})
					})
                }
			})
			.catch(function (err) { console.error("ERROR GETTING RECENT CHATS", err); });
		*/
		/*
		requests.getLCStatus(function (status) {
			console.log(status);
		});

        var user = slack.dataStore.getUserById(data.user).name;
        var arg = data.text.split(' ')[1];

        var username = arg != undefined ? arg : user;

		//list of agents accepting chats
		requests.getAgents("accepting chats", function (resp) {
			console.log("accepting:");
			resp.forEach(function (user) {
                //console.log(user.login);
            });
		});

		//list of agents not accepting chats
        requests.getAgents("not accepting chats", function (resp) {
        	console.log("not accepting:");
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