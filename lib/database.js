var Promise = require('promise');
var sqlite = require('sqlite3');

var slack = require('../lib/slack').rtm;

var logfile = require('../conf/config').logfile;

var db = new sqlite.Database(logfile);

function logCommand(user, command, duration) {
    return new Promise(function (fulfill, reject) {

        if (!(slack.dataStore.getUserByName(user) instanceof Object) && (user !== null))
            reject('Invalid user: ' + user);
        if (!(typeof(command) === 'string'))
            reject('Invalid command: ' + command);
        if (!(typeof(duration) === 'number') && (duration !== null))
            reject('Invalid duration: ' + duration);

        if (user === null)
            user = "NULL";
        else
            user = "'" + user + "'";
        if (duration === null)
            duration = 'NULL';

        var time = "datetime('now')";

        var query = "INSERT INTO command_history values(" +
            time + ", " +
            user + ", '" +
            command + "', " +
            duration + ")";

        db.run(query, function (err, res) {
            if (err) reject(err);
            else fulfill();
        });
    });
}

function logBounce(timestamp, date, user) {
    return new Promise(function (fulfill, reject) {

        var query = "INSERT INTO bounces values(" +
            timestamp + ", '" +
            date + "', '" +
            user + "')";

        db.run(query, function (err, res) {
            if (err) reject(err);
            else fulfill(res);
        });
    });
}

module.exports = {
    db: db,
    logCommand: logCommand,
    logBounce: logBounce
};
