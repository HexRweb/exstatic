const EventEmitter = require('events');
const Promise = require('bluebird');

/* eslint-disable import/no-extraneous-dependencies */
const { Exstatic } = require('@exstatic/core');
// @todo: make sure this works in first release
const t = require('@exstatic/core/lib/translations');
const log = require('@exstatic/core/lib/log');
const ensureArray = require('@exstatic/core/lib/utils/ensure-array');
/* eslint-enable import/no-extraneous-dependencies */
const { watch, build } = require('./extends');

class ExstaticDev extends Exstatic {
	constructor(...args) {
		super(...args);
		this.exitActions = [];
		this.events = new EventEmitter();
		this.events.setMaxListeners(25);
	}

	build() {
		return build.call(this);
	}

	// @todo: use refreshFile
	watch() {
		return watch.call(this);
	}

	// @todo: add support for relative files
	async refreshFile(filePath) {
		log.info(t('Exstatic.refreshing_file', { file: filePath }));
		const file = this.fm.file(filePath);

		if (file) {
			return file.reload();
		}

		// @todo: reject if filePath will not be in `this.files.dir`
		return this.fm.addFile(filePath, true);
	}

	refreshAll() {
		return Promise.each(this.fm.files, file => file.reload());
	}

	destroy() {
		process.removeListener('SIGINT', this.realOnBeforeExit)
			.removeListener('SIGTERM', this.realOnBeforeExit);
		this.exitActions.forEach(action => action());
	}

	registerExitHooks(...args) {
		Exstatic.prototype.registerExitHooks.apply(this, args);

		/* eslint-disable no-extra-bind */
		this.realOnBeforeExit = ((...args) => {
			this.exitActions.forEach(action => action());
			this.onBeforeExit(...args);
		}).bind(this);
		/* eslint-enable no-extra-bind */

		process.removeListener('SIGINT', this.onBeforeExit)
			.removeListener('SIGTERM', this.onBeforeExit)
			.on('SIGINT', this.realOnBeforeExit)
			.on('SIGTERM', this.realOnBeforeExit);
	}
}

module.exports = opts => new ExstaticDev(opts);
module.exports.ExstaticDev = ExstaticDev;
