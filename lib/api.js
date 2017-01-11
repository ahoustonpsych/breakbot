
var express = require('express');
var app = express();

var slack = require('./slack').rtm;

var breaks = require('../commands/breaks');

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

        console.log("listening at http://%s:%s", host, port);
    });
}

/*
 * returns all user on break, over break, or "out"
 */
app.get('/breaks', function (req,res) {
    var copy = JSON.parse(JSON.stringify(breaks.onbreak));
    var newonbreak = [];

    Object.keys(copy).forEach(function (n) {
        copy[n].id = n;
        newonbreak.push(copy[n]);
    });

    res.end(JSON.stringify({
        onbreak: newonbreak,
        overbreak: Object.keys(breaks.overbreak),
        out: Object.keys(breaks.out)
    }));
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

