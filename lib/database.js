let Promise = require('promise');

let mysql = require('mysql');

let conf = require('../conf/config');

let db = mysql.createConnection({
    host: conf.dbInfo[conf.ENV].host,
    user: conf.dbInfo[conf.ENV].user,
    password: conf.dbInfo[conf.ENV].pass,
    database: conf.dbInfo[conf.ENV].db
});

db.connect();

module.exports = {
    db: db,
    initdb: initdb,
    log: log
};

function initdb() {
    db.query('CREATE TABLE IF NOT EXISTS command_history' +
        ' (date DATETIME, username TEXT, channel TEXT, command TEXT, duration INTEGER, reason TEXT)');
}

function log(table, data) {
    return new Promise((fulfill, reject) => {
        let query,
            values = [],
            columns = Object.keys(data).sort();

        columns.forEach((key) => {
            values.push("'" + data[key] + "'");
        });

        if (values[columns.indexOf('date')] === "'now'")
            values[columns.indexOf('date')] = "NOW()";

        if (values[columns.indexOf('duration')] === 'null')
            values[columns.indexOf('duration')] = 0;

        if (values[columns.indexOf('reason')] === 'null')
            values[columns.indexOf('reason')] = NULL;

        /* INSERT INTO $table ($key1,$key2,$key3) VALUES ($value1,$value2,$value3) */
        query =
            'INSERT INTO ' + table +
            ' ( ' + columns.toString() + ' ) ' +
            'VALUES' + ' ( ' + values.toString() + ' ) ';

        console.log(new Date().toLocaleString() + ' logging to db:');
        console.log(query);

        db.query(query, (err, res) => {
            if (err) reject(err);
            else fulfill(res);
        });
    });
}

/* old sqlite3 logging funcs */
// function initdb() {
//     db.run('CREATE TABLE IF NOT EXISTS command_history' +
//         ' (date TEXT, username TEXT, channel TEXT, command TEXT, duration INTEGER, reason TEXT)');
//     db.run('CREATE TABLE IF NOT EXISTS illegal (date TEXT, username TEXT, desc TEXT)');
//
//     db.run('CREATE UNIQUE INDEX IF NOT EXISTS timeindex ON command_history (date)');
// }
//
// function log(table, data) {
//     return new Promise(function (fulfill, reject) {
//         let values = [];
//         let query = '';
//
//         let columns = Object.keys(data).sort();
//
//         columns.forEach(function (key) {
//             values.push("'" + data[key] + "'");
//         });
//
//         if (values[columns.indexOf('date')] === "'now'")
//             values[columns.indexOf('date')] = "datetime('now')";
//
//         /* INSERT INTO $table ($key1,$key2,$key3) VALUES ($value1,$value2,$value3) */
//         query = 'INSERT INTO ' +
//             table + ' ( ' +
//             columns.toString() + ' ) ' +
//             'VALUES' + ' ( ' +
//             values.toString() + ' ) ';
//
//         db.run(query, function (err, res) {
//             if (err) reject(err);
//             else fulfill(res);
//         });
//     });
// }
