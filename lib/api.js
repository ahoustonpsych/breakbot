const _ = require('lodash');
let express = require('express');
let app = express();
let bodyParser = require('body-parser');

let slack = require('./slack').rtm;
let conf = require('../conf/config');

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

        console.log(new Date().toLocaleString() + ' listening at http://%s:%s', host, port);

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

app.use(bodyParser.json()); // json-encoded bodies
app.use(bodyParser.urlencoded({extended: true})); //url-encoded bodies

/*
 * returns all user on break, over break, task, on lunch, or on bio
 */
app.get('/breaks', function (req,res) {
    //TODO fix this and the others
    res.status(500).end();
    return;
    let breaks = globals
    let newonbreak = [],
        newoverbreak = [],
        newlunch = [],
        newbio = [],
        newtask = [];

    /* copies to avoid overwriting the break data */
    let onbreakcopy = JSON.parse(JSON.stringify(breaks.active)),
        lunchcopy = JSON.parse(JSON.stringify(breaks.lunch)),
        biocopy = JSON.parse(JSON.stringify(breaks.bio));

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
    res.status(500).end();
    return;

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
    res.status(500).end();
    return;

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
    res.status(500).end();
    return;

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

app.get('/punched', (req, res) => {
    res.status(500).end();
    return;

    let chatters = [];
    let phoners = [];

    Object.keys(globals.channels[conf.channelDesignation['support']].punches).forEach(user => phoners.push(user));

    res.end(JSON.stringify({total: phoners.length, phones: phoners.sort()}));
    //globals.channels[conf.channelDesignation['support']].punches.forEach(user => phoners.push(user.name));

});

/* TODO finish this */
app.post('/update', (req, res) => {
    res.status(500).end();
    return;

    // res.status(500).end();
    // return;
    //name, type, expire

    let err = {
        error: 1,
        msg: ''
    };

    let username,
        group,
        breakType,
        expireTime,
        channel;

    let validTypes = ['brb', 'bio', 'lunch', 'task'];
    let validGroups = {
        'phones': conf.channelDesignation['support'],
        'chats': conf.channelDesignation['livechat'],
        //windows: conf.channelDesignation['windows']
    };

    if (!(!!req.body.name &&
        !!req.body.group &&
        !!req.body.type &&
        !!req.body.expire)) {
        err.msg = 'Missing property';
        res.status(500).send(JSON.stringify(err)).end();
        return;
    }

    username = req.body.name;
    group = req.body.group;
    breakType = req.body.type;
    expireTime = Date.parse(req.body.expire);

    if (isNaN(expireTime)) {
        err.msg = 'Invalid date/time';
        res.status(500).send(JSON.stringify(err)).end();
        return;
    } else {
        expireTime = new Date(expireTime);
    }

    if (validTypes.indexOf(breakType) === -1) {
        err.msg = 'Invalid break type';
        res.status(500).send(JSON.stringify(err)).end();
        return;
    } else if (breakType === 'brb') {
        breakType = 'active';   // total hack, need to update this if I change the break structure
    }

    if (!(slack.getUser(username) instanceof Object)) {
        err.msg = 'Invalid username';
        res.status(500).send(JSON.stringify(err)).end();
        return;
    }

    if (!(group in validGroups)) {
        err.msg = 'Invalid group';
        res.status(500).send(JSON.stringify(err)).end();
        return;
    } else {
        channel = validGroups[group]
    }

    if (typeof(channel) !== 'string') {
        err.msg = 'Encountered invalid channel: ' + channel;
        res.status(500).send(JSON.stringify(err)).end();
        return;
    }

    ret = {
        username: username,
        group: group,
        channel: channel,
        breakType: breakType,
        expireTime: expireTime
    };

    //globals.channels[channel].updateBreaks(username, breakType, expireTime);

    //globals.channels.updateBreak

    res.status(200).send(JSON.stringify(ret)).end();

});

/*
 * dump all relevant channel data
 */
app.get('/dump', (req,res) => {
    let strGlobals, dump,
        globcopy = _.cloneDeep(globals);

    _.each(globcopy.channels, (i,j,k) => delete globcopy.channels[j].meta.cooldownGrace);
    console.log(globcopy.channels['breakbot-windows'].meta);

    strGlobals = _.attempt(_.partial(JSON.stringify, globcopy));
    dump = _.attempt(_.partial(JSON.parse, strGlobals));
    Object.keys(dump.channels).forEach(c => delete dump.channels[c].punches);
    res.status(200).send(JSON.stringify(dump)).end();
});

/* slack webhook url
 * receives data when a user clicks an interactive slack button
 */
app.all('/slack/buttons', (req, res) => {
    console.log(new Date().toLocaleString(), 'RECEIVED DATA FROM SLACK:', req.body);
});