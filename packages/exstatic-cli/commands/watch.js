const exstatic = require('exstatic-dev');
const Error = require('../lib/exstatic-error');
const {readFile} = require('fs').promises;

module.exports = {
	desc: 'Rebuild affected files when you make a change',
	builder: {
		d: {
			alias: 'dir',
			describe: 'directory to run in'
		}
	},
	handler: async function (argv) {
		if (argv.d) {
			try {
				process.chdir(argv.d);
			} catch (error) {
				const message = error.code === 'ENOENT' ? 'it does not exist' : error.message;
				throw new Error(`Unable to run in ${argv.d} - ${message}`);
			}
		}

		// @todo: Add isExstaticInstance check

		const instance = exstatic();

		try {
			await instance.initialize();
			await instance.loadFiles();
			await instance.write();
		} catch (error) {
			throw new Error(`Watch failed - ${error.message}`);
		}
		return instance.watch();
	}
}
