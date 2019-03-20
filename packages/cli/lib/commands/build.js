const exstatic = require('@exstatic/dev');
const {error: Error} = require('@exstatic/utils');
const preHandle = require('../base-handler');

module.exports = {
	desc: 'Compile your site',
	async handler(argv) {
		preHandle(argv);
		const instance = exstatic();

		try {
			await instance.build();
		} catch (error) {
			console.error(error.stack);
			throw new Error('Build failed! Stack was dumped.');
		}
	}
};
