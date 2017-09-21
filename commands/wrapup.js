
var fs = require('fs');
var Promise = require('promise');

var conf = require('../conf/config');

var concurrent = {};

module.exports = {
    concurrent: concurrent,
    saveWrapup: saveWrapup,
    restoreWrapup: restoreWrapup
};

function saveWrapup() {

    var that = this;

    return new Promise(function (fulfill, reject) {

        /* all break data */
        var wrapupdata = JSON.stringify(that.concurrent);

        if (wrapupdata !== undefined) {
            fs.writeFileSync(conf.restore.wrapupfile, wrapupdata);
            fulfill('success');
        }

        else reject('empty wrapup data somehow: ' + wrapupdata);

    });
}

function restoreWrapup() {

    var that = this;

    fs.readFile(conf.restore.wrapupfile, 'utf8', function (err,res) {

        var breakdata = '{}'

        if (err) console.error('not found');

        else if (!res) {
            console.log('no wrapup data in file');
        }

        else {

            that.concurrent = JSON.parse(res);

            //return if lunch schedule is empty
            if (concurrent === {})
                return;

            //restore lunch times to date objects
            Object.keys(that.concurrent).forEach(function (user) {
                if (that.concurrent[user].hasOwnProperty('start'))
                    that.concurrent[user].start = new Date(that.concurrent[user].start);
            });

        }

        if (breakdata !== undefined) {
            fs.writeFileSync(conf.restore.wrapupfile, breakdata);
        }

    });
}