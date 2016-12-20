var sqlite = require('sqlite3');
var file = require('./conf/config').logfile;
var db = new sqlite.Database(file);

exports.db = db;