# breakbot

# installation
"forever" keeps the process running forever (like systemd with services):

`npm install forever -g`

# config
* in `conf/`, rename `_config.js` to `config.js`
* in `config.js`, fill in the following settings:
    * **slackAPIKey** - create a new bot user in slack and get the key here: https://TeamName.slack.com/apps/new/A0F7YS25R-bots
        * **note:** you'll need to define which channels to operate in when creating the bot user
    * **channels** - slack channels to monitor for normal commands
    * **channelDesignation** - department-channel pairing. use the `channels` options to fill these

# start
once the configs are set, run this to start breakbot in the background:

`forever -a -l forever.log -o logs/general.log -e logs/error.log start index.js`

or, if you don't need it to run in the background:

`node index.js`

# logs

stdout goes to `logs/general.log`

stderr goes to `logs/error.log`

# issues/features
https://github.com/TheGreekBrit/breakbot/issues

you can also just poke me (TheGreekBrit) directly