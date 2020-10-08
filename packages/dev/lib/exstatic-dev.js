const EventEmitter = require('events');
const {Exstatic} = require('@exstatic/core');
const {log} = require('@exstatic/logging');
const {mapSeries} = require('@exstatic/utils');
const t = require('@exstatic/core/lib/translations');
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

	async refreshFile(fileOrPath) {
		let file = fileOrPath;
		if (typeof fileOrPath === 'string') {
			file = this.fm.file(fileOrPath);
		}

		if (!file) {
			// @todo: reject if filePath will not be in `this.files.dir`
			const file = await this.fm.addFile(fileOrPath, true);
			await file.compile();
			return file.save();
		}

		log.info(t('Exstatic.refreshing_file', {file: file.source}));

		await file.reload();
		await file.compile();
		await this.hook.executeHook('pre-write', [], [file], true);
		return file.save();
	}

	refreshAll() {
		return mapSeries(this.fm.files, file => this.refreshFile(file));
	}

	destroy() {
		process.removeListener('SIGINT', this.realOnBeforeExit)
			.removeListener('SIGTERM', this.realOnBeforeExit);
		this.exitActions.forEach(action => action());
		this.fm.temp.releaseAll();
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

module.exports = options => new ExstaticDev(options);
module.exports.ExstaticDev = ExstaticDev;
