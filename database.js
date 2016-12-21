var Promise = require('promise');
var slack = require('./lib/slack').rtm;

var sqlite = require('sqlite3');
var file = require('./conf/config').logfile;
var db = new sqlite.Database(file);

function logCommand(user, command, duration) {
    return new Promise(function (fulfill, reject) {

        if (!(slack.dataStore.getUserByName(user) instanceof Object) && (user != null))
            reject("Invalid user: " + user);
        if (!(typeof(command) === 'string'))
            reject("Invalid command: " + command);
        if (!(typeof(duration) === 'number') && (duration != null))
            reject("Invalid duration: " + duration);

        if (user === null)
            user = "NULL";
        else
            user = "'" + user + "'";
        if (duration === null)
            duration = "NULL";

        /* current time */
        var time = "datetime('now', 'localtime')";

        var query = "INSERT INTO command_history values(" +
            time        + ", " +
            user        + ", '" +
            command     + "', " +
            duration    + ")";

        db.run(query, function (err, res) {
            if(err) reject(err);
            else fulfill(); });
    });
}

module.exports = {
    db: db,
    logCommand: logCommand
};
