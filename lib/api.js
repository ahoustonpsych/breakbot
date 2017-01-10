
var express = require('express');
var app = express();

var slack = require('./slack').rtm;

var breaks = require('../commands/breaks');

module.exports = {
    initserver: initserver
};

function initserver() {
    var server = app.listen(7254, function () {
        var host = server.address().address;
        var port = server.address().port;

        console.log("listening at http://%s:%s", host, port);
    });
}

app.get('/breaks', function (req,res) {
    res.end(JSON.stringify({
        onbreak: [breaks.onbreak],
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

