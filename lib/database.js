var Promise = require('promise');
var sqlite = require('sqlite3');

var slack = require('../lib/slack').rtm;

var conf = require('../conf/config');
var logfile = conf.logfile[conf.ENV];

var db = new sqlite.Database(logfile);

function initdb() {
    db.run('CREATE TABLE IF NOT EXISTS bounces (timestamp Number, date TEXT, username TEXT)');
    db.run('CREATE TABLE IF NOT EXISTS command_history (date TEXT, username TEXT, command TEXT, duration INTEGER)');

    db.run('CREATE UNIQUE INDEX IF NOT EXISTS timeindex ON bounces (timestamp)');
}

function log(table, data) {
    return new Promise(function (fulfill, reject) {
        var values = [];
        var query = '';

        var columns = Object.keys(data).sort();

        columns.forEach(function (key) {
            values.push("'" + data[key] + "'");
        });

        if (values[columns.indexOf('date')] === "'now'")
            values[columns.indexOf('date')] = "datetime('now')";

        /* INSERT INTO $table ($key1,$key2,$key3) VALUES ($value1,$value2,$value3) */
        query = 'INSERT INTO ' +
            table + ' ( ' +
            columns.toString() + ' ) ' +
            'VALUES' + ' ( ' +
            values.toString() + ' ) ';

        db.run(query, function (err, res) {
            if (err) reject(err);
            else fulfill(res);
        });
    });
}

module.exports = {
    db: db,
    initdb: initdb,
    log: log
};
