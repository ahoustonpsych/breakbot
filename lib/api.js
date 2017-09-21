
var express = require('express');
var app = express();

var slack = require('./slack').rtm;

//var breaks = require('../commands/breaks');
let globals = require('../conf/config.globals');
var luncher = require('../commands/luncher');

var topic = require('../commands/topic');

/*
 * exposes endpoints to access certain data accumulated by the bot
 */
module.exports = {
    initserver: initserver
};

/*
 * starts express server
 */
function initserver() {
    var server = app.listen(7254, function () {
        var host = server.address().address;
        var port = server.address().port;

        console.log('listening at http://%s:%s', host, port);

    });
}

/*
 * set access control headers
 */
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', req.get('origin'));
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Cookie');
    res.header('Access-Control-Allow-Credentials', true);
    next();
});

/*
 * returns all user on break, over break, out, on lunch, or on bio
 */
app.get('/breaks', function (req,res) {
    var newonbreak = [];
    var newlunch = [];
    var newbio = [];

    /* copies to avoid overwriting the break data */
    var onbreakcopy = JSON.parse(JSON.stringify(breaks.active));
    var lunchcopy = JSON.parse(JSON.stringify(breaks.lunch));
    var biocopy = JSON.parse(JSON.stringify(breaks.bio));

    /* on break list formatting */
    Object.keys(onbreakcopy).forEach(function (n) {
        onbreakcopy[n].id = n;
        newonbreak.push(onbreakcopy[n]);
    });

    /* lunch list formatting */
    Object.keys(lunchcopy).forEach(function (n) {
        lunchcopy[n].id = n;
        newlunch.push(lunchcopy[n]);
    });

    /* bio list formatting */
    Object.keys(biocopy).forEach(function (n) {
        biocopy[n].id = n;
        newbio.push(biocopy[n]);
    });

    var breakData = {
        active: newonbreak,
        overbreak: Object.keys(breaks.over),
        out: Object.keys(breaks.out),
        lunch: newlunch,
        bio: newbio
    };

    res.end(JSON.stringify(breakData));
});

/*
 * returns current lunch schedule
 */
app.get('/lunches', function (req,res) {

    var lunchData = {
        schedule: []
    };

    if (typeof(luncher.schedule) !== 'object') {
        console.error(new Date().toLocaleString() + ' invalid lunch schedule object: ' + luncher.schedule);
        res.end(JSON.stringify({schedule: []}));
    }

    Object.keys(luncher.schedule).forEach(function (slot) {
        lunchData.schedule.push(luncher.schedule[slot]);
    });

    if (typeof(lunchData) !== 'object') {
        console.error(new Date().toLocaleString() + ' invalid lunch schedule object: ' + lunchData);
        res.end(JSON.stringify({schedule: []}));
    }

    res.end(JSON.stringify(lunchData));
});

/*
 * returns list of chatters from the topic
 */
app.get('/chatters', function (req, res) {

    var topicChatters = topic.getChatters(); // rough list of the chatters in the topic of #livechat

    var chatterslower = topicChatters.map(function (el) { return el.toLowerCase(); });

    //pull out names that are actually valid usernames
    var chatters = chatterslower.filter(function (el) {
        return typeof(slack.dataStore.getUserByName(el)) === 'object';
    });

    //set -> array
    var chattersuniq = chatters.filter(function (el, index, that) {
        return that.indexOf(el) === index;
    });

    if (typeof(chattersuniq) !== 'object')
        res.end(JSON.stringify([]));

    res.end(JSON.stringify(chattersuniq));

});


/* localhost/users
 * endpoint that returns the emails of all LW employees
 * mostly current employees, but sadly some former employees are mixed in as well
 * does not include users that don't have an @liquidweb.com email (cloudsites, wiredtree, etc.)
 */
app.get('/users', function (req,res) {

    var list = [];
    var user = undefined;

    Object.keys(slack.dataStore.users).forEach(function (id) {

        user = slack.dataStore.users[id];

        /* strips out users with no email and deactivated accounts */
        if (user.profile.email !== undefined
            && user.profile.email.match(/@liquidweb\.com/i) !== null
            && !user.deleted)
            list.push(user.profile.email);
    });

    /* jsonify results and send as response */
    res.end(JSON.stringify(list));
});

