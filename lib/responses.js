const respconf = require('../conf/config.responses.json');
let _ = require('lodash');
let list = {};

_.each(respconf, (val,key,col) => list[key] = _.template(val));

function Responses() {
    return list;
}

module.exports = Responses;