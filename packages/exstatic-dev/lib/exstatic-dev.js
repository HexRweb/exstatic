const {Exstatic} = require('exstatic');
const {watch} = require('./extends');

class ExstaticDev extends Exstatic {
	constructor(...args) {
		super(...args);
		this.exitActions = [];
	}

	watch() {
		return watch.call(this);
}

	registerExitHooks(...args) {
		Exstatic.prototype.registerExitHooks.apply(this, args);

		this.realOnBeforeExit = ((...args) => {
			this.exitActions.forEach(action => action());
			this.onBeforeExit(...args);
		}).bind(this);

		process.off('SIGINT', this.onBeforeExit)
			.off('SIGTERM', this.onBeforeExit)
			.on('SIGINT', this.realOnBeforeExit)
			.on('SIGTERM', this.realOnBeforeExit);
	}
}

module.exports = opts => new ExstaticDev(opts);
module.exports.ExstaticDev = ExstaticDev;
