const exstatic = require('exstatic-dev');
const Error = require('../lib/exstatic-error');

module.exports = {
	desc: 'Rebuild affected files when you make a change',
	builder: {
		d: {
			alias: 'dir',
			describe: 'directory to run in'
		}
	},
	async handler({d}) {
		if (d) {
			try {
				process.chdir(d);
			} catch (error) {
				const message = error.code === 'ENOENT' ? 'it does not exist' : error.message;
				throw new Error(`Unable to run in ${d} - ${message}`);
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
};
