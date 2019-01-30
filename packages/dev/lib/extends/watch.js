const {unlink} = require('fs');
const Promise = require('bluebird');
const chokidar = require('chokidar');
// @todo: make sure this functions properly in first release
/* eslint-disable import/no-extraneous-dependencies */
const {Exstatic} = require('@exstatic/core');
const File = require('@exstatic/core/lib/file');
const log = require('@exstatic/core/lib/log');
const normalize = require('@exstatic/core/lib/utils/normalize');
/* eslint-enable import/no-extraneous-dependencies */

function noSlashes(input) {
	return input
		.replace(/^\/+/, '')
		.replace(/\/+$/, '');
}

module.exports = function watchForChanges() {
	if (!(this instanceof Exstatic)) {
		throw new TypeError('Incorrect usage of watch - did not received Exstatic instance');
	}

	const isLayout = fullPath => fullPath.includes(this.files.layoutsDir);
	const isPartial = fullPath => fullPath.includes(this.files.partialsDir);
	const isConfig = fullPath => fullPath.includes(this.files.config);

	const removeLayoutRoot = fullPath => noSlashes(fullPath.replace(this.files.layoutsDir, ''));
	const removePartialRoot = fullPath => noSlashes(fullPath.replace(this.files.partialsDir, ''));
	const removePageRoot = fullPath => noSlashes(fullPath.replace(this.files.inputDir, ''));

	const foldersToWatch = [this.files.inputDir];

	if (!this.files.layoutsDir.includes(this.files.inputDir)) {
		foldersToWatch.push(this.files.layoutsDir);
	}

	if (!this.files.partialsDir.includes(this.files.inputDir)) {
		foldersToWatch.push(this.files.partialsDir);
	}

	if (this.files.config) {
		foldersToWatch.push(this.files.config);
	}

	const watcher = chokidar.watch(foldersToWatch, {persistent: true});

	watcher.on('ready', () => {
		watcher.on('add', async absolutePath => {
			absolutePath = normalize(absolutePath);

			if (isLayout(absolutePath)) {
				return log.info(`Layout added: ${removeLayoutRoot(absolutePath)}`);
			}

			if (isPartial(absolutePath)) {
				return log.info(`Partial added: ${removePartialRoot(absolutePath)}`);
			}

			log.info(`Page added: ${removePageRoot(absolutePath)}`);

			await this.fm.addFile(absolutePath);
			this.fm.file(absolutePath).write();
		});

		watcher.on('change', absolutePath => {
			absolutePath = normalize(absolutePath);
			let globalChange = false;

			if (isConfig(absolutePath)) {
				log.info('Config file changed, reloading');
				return this.events.emit('TRIGGER_RESTART');
			}

			if (isLayout(absolutePath)) {
				log.info(`Layout ${removeLayoutRoot(absolutePath)} changed; rebuilding everything`);
				globalChange = true;
			} else if (isPartial(absolutePath)) {
				log.info(`Partial ${removePartialRoot(absolutePath)} changed; rebuilding everything`);
				globalChange = true;
			}

			if (globalChange) {
				return this.refreshAll();
			}

			return this.refreshFile(absolutePath);
		});

		watcher.on('unlink', absolutePath => {
			absolutePath = normalize(absolutePath);
			let rebuild = false;

			if (isLayout(absolutePath)) {
				log.info(`Layout ${removeLayoutRoot(absolutePath)} removed; rebuilding everything`);
				rebuild = true;
			}

			if (isPartial(absolutePath)) {
				log.info(`Partial ${removePartialRoot(absolutePath)} removed; rebuilding everything`);
				rebuild = true;
			}

			if (rebuild) {
				return this.fm.files.forEach(file => {
					log.info(`Rebuilding file ${removePageRoot(file.source)}`);
					file.reload();
				});
			}

			let index = -1;
			this.fm.files.forEach((file, idx) => {
				if (file.source === absolutePath) {
					index = idx;
				}
			});

			if (index > 0) {
				log.info(`Removed ${removePageRoot(absolutePath)}`);
				const {wroteTo} = this.docs[index];
				if (wroteTo) {
					unlink(wroteTo, () => true);
					// @todo: remove directory if empty
				}

				this.fm.files.splice(index, 1);
			}
		});

		log.info(`Watching:\n\t- ${foldersToWatch.join('\n\t- ')}`);
		log.info('Waiting for changes');
	});

	this.exitActions = [() => {
		log.verbose('Disabling folder watch');
		watcher.close();
	}];

	return this;
};
