# chopsd
Node.js Chat-ops Daemon - automate all the things!

# TODO
* any diagnostic messaging written to console.log should probably try out util.inspect(obj, { colors: true }) because that's cool stuff.
* Any contributor using a console without Xterm colors is sad and I don't want to know you.

# new bots

## minimum bot requirements:

    const Bot = require('./bot-base');
    const Vow = require('vow');

    module.exports = new Bot('example-bot', [{
      name: "example-bot.hello",
      pattern: /^example$/i,
      handler: function(match, context) {
        context.messages.push("Hello world!");

        return Vow.resolve();
      }
    }]);

* place this file inside the /bots folder, and add example-bot to the config/index.js bots array to load your new command on startup.

# Bot notes
* You may contribute to ANY bot in the /bots folder you like (or add your own).
* The framework should be flexible enough to a allow for extension without breaking existing bots.
* Modifications to app.js, and bot-base, and Pipe obviously carry more danger for side-effects.
* Bot commands must return Promises! I can't stress that enough. The entire command pipeline depends on this fundamental fact.
* Please ensure that all your command patterns use case insensitivity and are bounded by the line start/end tags.
```javascript
  /^create task (.*)$/i
```

### the db
We have one. It's currently using sqlite3. I might change that in the future. In general, commands should avoid storing things in the database directly, and should instead leverage the scoped "settings" options as much as possible. The command "deploy my.package to dev1" requires minimal thought, and reads so easily even an project manager could do it.

### services vs bots

A bot, is, in general, a collection of commands. It is responsible for matching a regular expression against user input, and writing a reply() back to the current channel.

Any complex functionality or third-party integration, should be delegated to a _service_.

A guiding principle for this project is that components *can* and *will* be swapped, and that is OK. It should be _simple_ to swap out TFS for jenkins or travis, or TeamCity in the future if we decide. Let's be nimble.

### chops has a mind, but he needs a soul...

### tests
You should write some. Debugging node is pretty difficult.

### config/index.js

	module.exports = {
		debug: true,

		db: {
			path: ':memory:',
			cached: false,
			verbose: true,
			trace: true
		},

		bots: [
			'chops',
			'ci-bot',
			'duckbot',
			'task-bot'
		],

		services: { },

		globals: {
			"dev": "asdf",
			"test": "qwerty"
		},

		chat: {
			provider: "slack",
			token: "your-own-slack-token-could-go-here"
		}
	}
