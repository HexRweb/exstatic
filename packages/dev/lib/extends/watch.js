const chokidar = require('chokidar');
const {Exstatic} = require('@exstatic/core');
const {log} = require('@exstatic/logging');
const {normalizePath: normalize, fs} = require('@exstatic/utils');

function noSlashes(input) {
	return input
		.replace(/^\/+/, '')
		.replace(/\/+$/, '');
}

module.exports = function watchForChanges() {
	if (!(this instanceof Exstatic)) {
		throw new TypeError('Incorrect usage of watch - did not received Exstatic instance');
	}

	const isLayout = fullPath => fullPath.includes(this.fm.layoutsDir);
	const isPartial = fullPath => fullPath.includes(this.fm.partialsDir);
	const isConfig = fullPath => fullPath.includes(this.fm.config);

	const removeLayoutRoot = fullPath => noSlashes(fullPath.replace(this.fm.layoutsDir, ''));
	const removePartialRoot = fullPath => noSlashes(fullPath.replace(this.fm.partialsDir, ''));
	const removePageRoot = fullPath => noSlashes(fullPath.replace(this.fm.inputDir, ''));

	const foldersToWatch = [this.fm.inputDir];

	if (!this.fm.layoutsDir.includes(this.fm.inputDir)) {
		foldersToWatch.push(this.fm.layoutsDir);
	}

	if (!this.fm.partialsDir.includes(this.fm.inputDir)) {
		foldersToWatch.push(this.fm.partialsDir);
	}

	if (this.fm.config) {
		foldersToWatch.push(this.fm.config);
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

			const file = this.fm.addFile(absolutePath);
			this.refreshFile(file);
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

		watcher.on('unlink', async absolutePath => {
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

			const index = this.fm.files.findIndex(file => file.source === absolutePath);

			if (index < 0) {
				return;
			}

			log.info(`Removed ${removePageRoot(absolutePath)}`);
			const file = this.fm.files[index];
			this.fm.files.splice(index, 1);

			if (file.filename) {
				await fs.unlink(file.filename).catch(() => true);
				// @todo: remove directory if empty
			}

			if (file.tempContext) {
				await file.temp.release(file.tempContext);
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
