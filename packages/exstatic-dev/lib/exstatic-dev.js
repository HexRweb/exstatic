const {Exstatic} = require('@exstatic/core');
const {watch, build} = require('./extends');

class ExstaticDev extends Exstatic {
	constructor(...args) {
		super(...args);
		this.exitActions = [];
	}

	build() {
		return build.call(this);
	}

	watch() {
		return watch.call(this);
	}

	registerExitHooks(...args) {
		Exstatic.prototype.registerExitHooks.apply(this, args);

		/* eslint-disable no-extra-bind */
		this.realOnBeforeExit = ((...args) => {
			this.exitActions.forEach(action => action());
			this.onBeforeExit(...args);
		}).bind(this);
		/* eslint-enable no-extra-bind */

		process.off('SIGINT', this.onBeforeExit)
			.off('SIGTERM', this.onBeforeExit)
			.on('SIGINT', this.realOnBeforeExit)
			.on('SIGTERM', this.realOnBeforeExit);
	}
}

module.exports = opts => new ExstaticDev(opts);
module.exports.ExstaticDev = ExstaticDev;
