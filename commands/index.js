let fs = require('fs');
let path = require('path');

function getDirectories() {
    return fs.readdirSync(__dirname).filter(function (file) {
        return file.charAt(0) !== '.' && fs.statSync(path.join(__dirname, file)).isDirectory();
    });
}

let dirs = getDirectories();
let modules = [];

dirs.forEach(function (dir) {
    modules.push(require('./' + dir));
});

module.exports = modules;