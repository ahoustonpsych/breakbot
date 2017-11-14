let Promise = require('promise');
let sqlite = require('sqlite3');

let slack = require('../lib/slack').rtm;

let conf = require('../conf/config');
let logfile = conf.logfile[conf.ENV];

let db = new sqlite.Database(logfile);

let mysql = require('mysql');

// let db = mysql.createConnection({
//     host: conf.dbHost,
//     user: conf.dbUser,
//     password: conf.dbPass,
//     database: conf.db
// });
//
// db.connect();

function initdbMYSQL() {
    db.query('CREATE TABLE IF NOT EXISTS command_history' +
        ' (date DATETIME, username TEXT, channel TEXT, command TEXT, duration INTEGER, reason TEXT)');
    //db.run('CREATE TABLE IF NOT EXISTS illegal (date TEXT, username TEXT, desc TEXT)');

    //db.run('CREATE UNIQUE INDEX IF NOT EXISTS timeindex ON command_history (date)');
}

function logMYSQL(table, data) {
    return new Promise((fulfill, reject) => {
        let query,
            values = [],
            columns = Object.keys(data).sort();

        columns.forEach((key) => {
            values.push("'" + data[key] + "'");
        });

        if (values[columns.indexOf('date')] === "'now'")
            values[columns.indexOf('date')] = "NOW()";

        /* INSERT INTO $table ($key1,$key2,$key3) VALUES ($value1,$value2,$value3) */
        query =
            'INSERT INTO ' + table +
            ' ( ' + columns.toString() + ' ) ' +
            'VALUES' + ' ( ' + values.toString() + ' ) ';

        console.log(query);

        db.query(query, (err, res) => {
            if (err) reject(err);
            else fulfill(res);
        });
    });
}

function initdb() {
    //db.run('CREATE TABLE IF NOT EXISTS bounces (timestamp Number, date TEXT, username TEXT)');
    db.run('CREATE TABLE IF NOT EXISTS command_history' +
        ' (date TEXT, username TEXT, channel TEXT, command TEXT, duration INTEGER, reason TEXT)');
    db.run('CREATE TABLE IF NOT EXISTS illegal (date TEXT, username TEXT, desc TEXT)');

    db.run('CREATE UNIQUE INDEX IF NOT EXISTS timeindex ON command_history (date)');
}

function log(table, data) {
    return new Promise(function (fulfill, reject) {
        let values = [];
        let query = '';

        let columns = Object.keys(data).sort();

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
