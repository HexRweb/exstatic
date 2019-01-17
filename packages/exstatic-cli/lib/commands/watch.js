const exstatic = require('@exstatic/dev');
const Error = require('../exstatic-error');
const preHandle = require('../base-handler');

module.exports = {
	desc: 'Rebuild affected files when you make a change',
	async handler(argv) {
		preHandle(argv);
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
