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

/*
 * dump all relevant channel data
 * excludes punches and cooldownGrace for reasons
 */
app.get('/dump', (req,res) => {
    let strGlobals, dump,
        globcopy = _.cloneDeep(globals);

    _.each(globcopy.channels, (i,j,k) => {
        delete globcopy.channels[j].meta.cooldownGrace;
        delete globcopy.channels[j].punches;
        delete globcopy.slack;
    });

    strGlobals = _.attempt(_.partial(JSON.stringify, globcopy));
    dump = _.attempt(_.partial(JSON.parse, strGlobals));
    res.status(200).send(JSON.stringify(dump)).end();
});

/* TODO finish this */
app.post('/update', (req, res) => {

    // res.status(500).end();
    // return;
    //name, type, expire

    let reqIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        response = {
            error: 1,
            msg: ''
        };

    validateUpdateArgs(req.body)
        .then(args => {
            let username = args.name,
                channel = args.channel,
                type = args.type,
                duration = args.duration;

            globals.channels[channel].updateBreaks(username, type, duration)
                .then(res => {
                    response.error = 0;
                    response.msg = 'Updated break for ' + username;

                    console.log(new Date().toLocaleString(),reqIP,response.msg);

                    res.status(200).send(JSON.stringify(response)).end();
                })
                .catch(err => {
                    response.msg = err;
                    res.status(400).send(JSON.stringify(response)).end();
                });
        })
        .catch(err => {
            response.msg = err;
            console.error(new Date().toLocaleString(), 'ERROR PARSING ARGS:', err);
            res.status(500).send(JSON.stringify(response)).end();
        });

    //res.status(200).send(JSON.stringify(ret)).end();

});

/*
 * removes username from break, if on break.
 */
app.post('/remove', (req, res) => {

    let username,
        reqIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        response = {
        error: 1,
        msg: ''
    };

    if (!req.body.name) {
        response.msg = 'Missing property: name';
        res.status(400).send(JSON.stringify(response)).end();
        return;
    }
    username = req.body.name;

    for (let channel in globals.channels) {
        let onbreak = globals.channels[channel].isOnBreak(username);

        if (onbreak) {
            globals.channels[channel].clearBreaks(username);
            if (globals.channels[channel].breaks.task.hasOwnProperty(username))
                delete globals.channels[channel].breaks.task[username];

            response.error = 0;
            response.msg = 'Removed ' + onbreak + ' from #' + channel;
            console.log(new Date().toLocaleString(),reqIP,response.msg);
            res.status(200).send(JSON.stringify(response)).end();
            return;
        }
    }

    console.log('only here if not on break');

    response.msg = 'Not on break: ' + username;
    console.log(new Date().toLocaleString(),reqIP,'ERROR:',response.msg);
    res.status(400).send(JSON.stringify(response)).end();

});

function validateUpdateArgs(args) {
    return new Promise((fulfill,reject) => {

        let err,
            validTypes = ['brb', 'bio', 'lunch', 'task'],
            validChannels = conf.channels;

        if (!args.name) {
            err = 'Missing property: name';
            reject(err);
        }
        if (!args.type) {
            err = 'Missing property: type';
            reject(err);
        }
        if (!args.duration) {
            err = 'Missing property: duration';
            reject(err);
        }
        if (!args.channel) {
            err = 'Missing property: channel';
            reject(err);
        }

        if (isNaN(args.duration)) {
            err = 'Invalid duration';
            reject(err);
        }

        if (validTypes.indexOf(args.type) === -1) {
            err = 'Invalid break type: ' + args.type;
            reject(err);
        } else if (args.type === 'brb') {
            args.type = 'active';   // total hack, need to update this if I change the break structure
        }

        if (!(slack.getUser(args.name) instanceof Object)) {
            err = 'Invalid name: ' + args.name;
            reject(err);
        }

        if (typeof(args.channel) !== 'string' || validChannels.indexOf(args.channel) === -1) {
            err = 'Encountered invalid channel: ' + args.channel;
            reject(err);
        }

        fulfill(args);
    })
}



/* slack webhook url
 * receives data when a user clicks an interactive slack button
 */
app.all('/slack/buttons', (req, res) => {
    console.log(new Date().toLocaleString(), 'RECEIVED DATA FROM SLACK:', req.body);
});