var onbreak = {};
var overbreak = {};
var out = {};
var lunch = {};
var bio = {};

module.exports = {
    onbreak: onbreak,
    overbreak: overbreak,
    out: out,
    lunch: lunch,
    bio: bio,
    clearBreaks: function (user) {
        clearBreaks(user);
    }
};

function clearBreaks(user) {
    delete onbreak[user];
    delete overbreak[user];
    delete lunch[user];
    delete bio[user];
}