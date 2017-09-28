
let express = require('express');
let app = express();

let slack = require('./slack').rtm;

//var breaks = require('../commands/breaks');
let globals = require('../conf/config.globals');
let luncher = require('../commands/luncher');

let topic = require('../commands/topic');

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
    let server = app.listen(7254, function () {
        let host = server.address().address;
        let port = server.address().port;

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
 * returns all user on break, over break, task, on lunch, or on bio
 */
app.get('/breaks', function (req,res) {
    let newonbreak = [];
    let newlunch = [];
    let newbio = [];

    /* copies to avoid overwriting the break data */
    let onbreakcopy = JSON.parse(JSON.stringify(breaks.active));
    let lunchcopy = JSON.parse(JSON.stringify(breaks.lunch));
    let biocopy = JSON.parse(JSON.stringify(breaks.bio));

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

    let breakData = {
        active: newonbreak,
        overbreak: Object.keys(breaks.over),
        task: Object.keys(breaks.task),
        lunch: newlunch,
        bio: newbio
    };

    res.end(JSON.stringify(breakData));
});

/*
 * returns current lunch schedule
 */
app.get('/lunches', function (req,res) {

    let lunchData = {
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

    let topicChatters = topic.getChatters(); // rough list of the chatters in the topic of #livechat

    let chatterslower = topicChatters.map(function (el) { return el.toLowerCase(); });

    //pull task names that are actually valid usernames
    let chatters = chatterslower.filter(function (el) {
        return typeof(slack.dataStore.getUserByName(el)) === 'object';
    });

    //set -> array
    let chattersuniq = chatters.filter(function (el, index, that) {
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

    let list = [];
    let user = undefined;

    Object.keys(slack.dataStore.users).forEach(function (id) {

        user = slack.dataStore.users[id];

        /* strips task users with no email and deactivated accounts */
        if (user.profile.email !== undefined
            && user.profile.email.match(/@liquidweb\.com/i) !== null
            && !user.deleted)
            list.push(user.profile.email);
    });

    /* jsonify results and send as response */
    res.end(JSON.stringify(list));
});

