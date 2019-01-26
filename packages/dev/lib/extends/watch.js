const {unlink} = require('fs');
const chokidar = require('chokidar');
const {Exstatic} = require('@exstatic/core');
const File = require('@exstatic/core/lib/file');
const log = require('@exstatic/core/lib/log');
const normalize = require('@exstatic/core/lib/utils/normalize');

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
		watcher.on('add', absolutePath => {
			absolutePath = normalize(absolutePath);

			if (isLayout(absolutePath)) {
				return log.info(`Layout added: ${removeLayoutRoot(absolutePath)}`);
			}

			if (isPartial(absolutePath)) {
				return log.info(`Partial added: ${removePartialRoot(absolutePath)}`);
			}

			log.info(`Page added: ${removePageRoot(absolutePath)}`);

			const file = new File({
				location: absolutePath,
				directory: this.files.inputDir,
				writePath: this.files.outputDir,
				url: this.data.site.url,
				tempFolder: this.files.tempDir,
				compiler: this._hbs.generateCompiler.bind(this._hbs)
			});

			file.write();
			this.docs.core.push(file);
		});

		watcher.on('change', absolutePath => {
			absolutePath = normalize(absolutePath);
			let force = false;

			if (isConfig(absolutePath)) {
				log.info('Config file changed, reloading');
				return this.events.emit('TRIGGER_RESTART');
			}

			if (isLayout(absolutePath)) {
				log.info(`Layout ${removeLayoutRoot(absolutePath)} changed; rebuilding everything`);
				force = true;
			} else if (isPartial(absolutePath)) {
				log.info(`Partial ${removePartialRoot(absolutePath)} changed; rebuilding everything`);
				force = true;
			}

			Promise.mapSeries(this.docs.core, async file => {
				if (force || file.source === absolutePath) {
					log.info(`Rebuilding Page ${removePageRoot(file.source)}`);
					await file.reload();
					await file.compile();
					return file.save();
				}
			});
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
				return this.docs.core.forEach(file => {
					log.info(`Rebuilding file ${removePageRoot(file.source)}`);
					file.reload('write');
				});
			}

			let index = -1;
			this.docs.core.forEach((file, idx) => {
				if (file.source === absolutePath) {
					index = idx;
				}
			});

			if (index > 0) {
				log.info(`Removed ${removePageRoot(absolutePath)}`);
				const {wroteTo} = this.docs.core[index];
				if (wroteTo) {
					unlink(wroteTo, () => true);
					// @todo: remove directory if empty
				}

				this.docs.core.splice(index, 1);
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
