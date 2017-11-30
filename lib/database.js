const _ = require('lodash');
let Promise = require('promise');

let mysql = require('mysql');

let conf = require('../conf/config');

let db_config = {
    host: conf.dbInfo[conf.ENV].host,
    user: conf.dbInfo[conf.ENV].user,
    password: conf.dbInfo[conf.ENV].pass,
    database: conf.dbInfo[conf.ENV].db
};

let db;

disconnectHandler();

module.exports = {
    db: db,
    queryDB: queryDB,
    initdb: initdb,
    log: log
};

function initdb() {
    db.query('CREATE TABLE IF NOT EXISTS command_history \
        (date DATETIME,\
        username TEXT,\
        channel TEXT, \
        command TEXT, \
        duration INTEGER,\
        reason TEXT)');

    db.query('CREATE TABLE IF NOT EXISTS punch_history \
        (date DATE,\
        time TIME,\
        username VARCHAR(30),\
        punched VARCHAR(3),\
        UNIQUE KEY (date, time, username, punched),\
        dept TEXT,\
        title TEXT,\
        supervisor TEXT,\
        real_name TEXT)');
}

function disconnectHandler() {

    db = mysql.createConnection(db_config);

    db.connect(err => {
        if (err) {
            console.error(new Date().toLocaleString() + ' error connecting to database: ', err);
            setTimeout(disconnectHandler, 2000);
        }
        else
            setInterval(() => db.query('SELECT 1'), 10000);
    });

    db.on('error', err => {
        console.error(new Date().toLocaleString() + ' database error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            disconnectHandler();
        }
    })
}

function log(table, data) {
    return new Promise((fulfill, reject) => {
        let query,
            values = [],
            columns = Object.keys(data).sort();

        columns.forEach((key) => {
            //escape apostrophes in names
            if (data[key] && typeof(data[key]) === 'string')
                data[key] = data[key].replace(/('|")/g, '\\$1');
            values.push("'" + data[key] + "'");
        });

        //TODO refactor this
        if (values[columns.indexOf('date')] === "'now'")
            values[columns.indexOf('date')] = 'NOW()';
        else if (values[columns.indexOf('date')] === "'today'")
            values[columns.indexOf('date')] = 'CURDATE()';

        if (values[columns.indexOf('time')] === "'now'")
            values[columns.indexOf('time')] = 'TIME(NOW())';

        if (values[columns.indexOf('duration')] === 'null')
            values[columns.indexOf('duration')] = 0;

        if (values[columns.indexOf('reason')] === 'null')
            values[columns.indexOf('reason')] = NULL;

        /* INSERT INTO $table ($key1,$key2,$key3) VALUES ($value1,$value2,$value3) */
        query = _.concat('INSERT INTO ', table,
            ' ( ', columns.toString(), ' ) ',
            'VALUES', ' ( ', values.toString(), ' )')
            .join('');

        // console.log(new Date().toLocaleString() + ' logging to db:');
        //console.log(query);
        //fulfill();

        db.query(query, (err, res) => {
            if (err) reject(err);
            else fulfill(res);
        });
    });
}

function queryDB(query) {
    return new Promise((fulfill, reject) => {
        db.query(query, (err, res) => {
            if (err) reject(err);
            else fulfill(res);
        });
    });
}