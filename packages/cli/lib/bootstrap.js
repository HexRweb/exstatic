const yargs = require('yargs');
const {error: ExError} = require('@exstatic/utils');

module.exports = yargs
	.usage('$0 <action>')
	.alias('h', 'help')
	.help()
	.option('d', {
		alias: ['directory'],
		desc: 'Directory to run in',
		global: true
	})
	.commandDir('./commands')
	.fail((message, err, yargs) => {
		err = err || new Error(message);
		message = message || '';

		if (err instanceof ExError) {
			return console.error(err.verbose ? err.toString() : err.message);
		}

		if (message.indexOf('Did you mean ') === 0) {
			yargs.showHelp();
			return console.log('\n\nCommand not found.', message);
		}

		if (message === 'SHOW_HELP') {
			return yargs.showHelp();
		}

		console.log(message || err.message);
	})
	.demandCommand(1, 'SHOW_HELP')
	.showHelpOnFail(true)
	.recommendCommands()
	.epilogue('⚠  Exstatic is extremely beta and not suitable for production ⚠')
	.argv;
