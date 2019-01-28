const EventEmitter = require('events');
const Promise = require('bluebird')

const {Exstatic} = require('@exstatic/core');
const {watch, build} = require('./extends');

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
		let promise = false;

		this.docs.forEach(file => {
			if (file.path === filePath) {
				promise = file.reload();
			}
		});

		if (promise) {
			return promise;
		}

		// @todo: reject if filePath will not be in `this.files.dir`
		this.docs.push(await this.loadFile(filePath));
	}

	refreshAll() {
		return Promise.each(ensureArray(this.docs), file => this.refreshFile(file.path));
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
