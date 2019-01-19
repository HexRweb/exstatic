const exstatic = require('@exstatic/dev');
const Error = require('../exstatic-error');
const preHandle = require('../base-handler');

module.exports = {
	desc: 'Compile your site',
	async handler(argv) {
		preHandle(argv);
		const instance = exstatic();

		try {
			await instance.build();
		} catch (error) {
			throw new Error(`Build failed - ${error.message}`);
		}
	}
};
