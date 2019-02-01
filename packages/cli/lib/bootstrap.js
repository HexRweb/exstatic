const yargs = require('yargs');
const ExstaticError = require('./exstatic-error');

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
	.fail((msg, err, yargs) => {
		if (err instanceof ExstaticError) {
			return console.error(err.message);
		}

		if (msg && msg.indexOf('Did you mean ') === 0) {
			yargs.showHelp();
			return console.log('\n\nCommand not found.', msg);
		}

		if (msg && msg === 'SHOW_HELP') {
			return yargs.showHelp();
		}

		console.log(msg || err.message);
	})
	.demandCommand(1, 'SHOW_HELP')
	.showHelpOnFail(true)
	.recommendCommands()
	.epilogue('⚠  Exstatic is extremely beta and not suitable for production ⚠')
	.argv;
