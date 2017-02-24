# breakbot

Commands here: https://wiki.int.liquidweb.com/articles/Breakbot

# installation
"forever" keeps the process running forever (like systemd with services):

`npm install forever -g`

# config
* in `conf/`, rename `_config.js` to `config.js`
* in `config.js`, fill in the following settings:
    * **slackAPIKey** - create a new bot user in slack and get the key here: https://lw.slack.com/apps/new/A0F7YS25R-bots
        * **note:** you'll need to define which channels to operate in when creating the bot user
    * **lc_APIUser** - livechatinc API user: https://my.livechatinc.com/agents/api-key/
    * **lc_APIKey** - livechatinc API key: https://my.livechatinc.com/agents/api-key/
    * **channel** - slack channel to monitor for normal commands
    * **notifychannel** - slack channel to send detail notifications (e.g. when a chat bounces)
    * **userdomain** - "**@domain.com**" where *domain.com* is a domain with an active livechatinc license installed
* **note:**
    * in some configuration settings, there's multiple values to set for test/dev/stage
    * you can define which one of those to use with the `NODE_ENV` environment variable
    * the default is **dev**

# start
once the configs are set, run this to start breakbot in the background:

`forever -a -l forever.log -o logs/general.log -e logs/error.log start index.js`

or, if you don't need it to run in the background:

`node index.js`

# logs

stdout goes to `logs/general.log`

stderr goes to `logs/error.log`

# issues/features
https://git.liquidweb.com/ahouston/breakbot/issues

you can also just poke me (ahouston) directly

# questions/hate/everything else
ahouston@liquidweb.com, or ahouston in slack