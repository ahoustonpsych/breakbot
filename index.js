var Promise = require('promise');

var slack = require('./lib/slack').rtm;

var messageController = require('./lib/messageController');
var breaks = require('./commands/breaks');
var conf = require('./conf/breaks.config');
var requests = require('./commands/lc_requests');


/* always listening */
slack.on('message', function(data) {
	messageController.handle(data);
});


/* runs every second */
function upkeep() {

	/* handle users on break */
    upkeepOnBreak()
        .then(function () {
        	/* handle users over break */
            upkeepOverBreak();
        })
        .catch(function (err) {
            console.error('ERROR WITH ONBREAK UPKEEP', err);
        });

    /* handle users that are out */
    if(Math.floor(process.uptime()) % 30 == 0)
    	upkeepOut();
}

function upkeepOnBreak() {
	return new Promise(function (fulfill, reject) {

        var now = new Date().getTime();

		/* current users on break */
        for(var user in breaks.onbreak) {

            console.log('user: ' + user);
            console.log('now: ' + now);
            console.log('outTime: ' + breaks.onbreak[user].outTime);
            console.log('duration: ' + breaks.onbreak[user].duration);
            console.log('channel: ' + breaks.onbreak[user].channel);

            /* now - (time of break + duration of break) in seconds */
            var delta = (now - (breaks.onbreak[user].outTime + (breaks.onbreak[user].duration * 1000))) / 1000;

            /* break expired */
            if(delta > 0) {
				breakExpired(user);
            }
            else {
                console.log(user + '\'s break expires in ' + delta + ' seconds.');
            }
        }
        fulfill();
	});
}

function upkeepOverBreak() {

    var now = new Date().getTime();

    for(var user in breaks.overbreak) {

    	/* removes user from being "on break" if it hasn't finished already */
		if(breaks.onbreak[user] instanceof Object) {
			delete breaks.onbreak[user];
            continue;
        }

		var delta = (now - (breaks.overbreak[user].outTime + (breaks.overbreak[user].duration * 1000))) / 1000;

        /* send reminder every conf.remindTime seconds */
        if (parseInt(delta) % conf.remindTime == 0) {
			sendReminder(user);
        }
    }
}

function upkeepOut() {
	for(var user in breaks.out) {
		requests.getAgentStatus(user)
        	.then(function (res) {
        		console.log(res);

            	/* checks if user already logged back in */
            	if (res == "accepting chats")
					delete breaks.out[user];

			})
			.catch(function (err) { console.error(err); });
	}
}

/*
 * processes users whose break just expired. sends notification if they haven't already logged back in
 */
function breakExpired(user) {

	/* switches user from "on break" to "over break" */
    breaks.overbreak[user] = breaks.onbreak[user];

    requests.getAgentStatus(user)
        .then(function (res) {
            console.log(res);

            /* checks if user already logged back in */
            if (res == "not accepting chats") {
                slack.sendMessage(user + ': your break has expired.', breaks.overbreak[user].channel);
                delete breaks.onbreak[user];
            }
            else {
                breaks.clearBreaks(user);
                console.log(user + ' silently logged back in. Deleting metadata.');
            }
        })
        .catch(function (err) { console.error(err); });
}

/*
 * sends message reminding agent to log back in, if they haven't already
 */
function sendReminder(user) {
    console.log('checking status of ' + user);
    requests.getAgentStatus(user)
        .then(function (res) {
            if (res == "not accepting chats") {
                console.log("CHAN: " + breaks.overbreak[user].channel);
                console.log("USER: " + user);
                slack.sendMessage(user + ': you need to log back into chats with *!back*', breaks.overbreak[user].channel);
            }
            else {
                breaks.clearBreaks(user);
                console.log(user + ' silently logged back in. Deleting metadata.');
            }
        })
        .catch(function (err) {
            console.error('ERROR GETTING AGENT STATUS', err);
        });
}

function main() {

	/* runs upkeep every second */
	setInterval(upkeep, 1000);
}

/* run */
if(require.main === module)
	main();