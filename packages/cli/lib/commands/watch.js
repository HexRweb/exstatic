const {ExstaticDev} = require('@exstatic/dev');
const {error: Error} = require('@exstatic/utils');
const preHandle = require('../base-handler');

module.exports = {
	desc: 'Rebuild affected files when you make a change',
	handler(argv) {
		preHandle(argv);

		let instance;

		async function startInstance() {
			instance = new ExstaticDev();
			instance.COMMAND = 'watch';

			instance.events.on('TRIGGER_RESTART', () => {
				instance.destroy();
				startInstance().catch(error => {
					throw new Error(`Unable to restart - ${error.message}`);
				});
			});

			await instance.build().catch(error => {
				if (argv.verbose) {
					console.error('Build failed:');
					const err = Error.coerce(error);
					err.verbose = true;

					throw err;
				}

				throw new Error(`Build failed - ${error.message}`);
			});

			return instance.watch();
		}

		return startInstance();
	}
};
