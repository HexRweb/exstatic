const yargs = require('yargs');
const ExstaticError = require('./exstatic-error');

module.exports = yargs.command('$0', '', () => {}, _ => {
	console.log('Nothing to do :)');
	process.exit(0);
})
	.commandDir('../commands')
	.fail((msg, err) => {
		if (err instanceof ExstaticError) {
			return console.error(err.message);
		}

		console.log(msg, err);
	})
	.help()
	.argv;
