const {unlink} = require('fs');
const chokidar = require('chokidar');
const {Exstatic} = require('@exstatic/core');
const File = require('@exstatic/core/lib/file');
const log = require('@exstatic/core/lib/log');
const normalize = require('@exstatic/core/lib/utils/normalize');

module.exports = function watchForChanges() {
	if (!(this instanceof Exstatic)) {
		throw new TypeError('Incorrect usage of watch - did not received Exstatic instance');
	}

	const foldersToWatch = [this.files.inputDir];

	if (!this.files.layoutsDir.includes(this.files.inputDir)) {
		foldersToWatch.push(this.files.layoutsDir);
	}

	if (!this.files.partialsDir.includes(this.files.inputDir)) {
		foldersToWatch.push(this.files.partialsDir);
	}

	log.info(`Watching folders: ${foldersToWatch.join(', ')}`);

	const watcher = chokidar.watch(foldersToWatch, {
		persistent: true
	});

	watcher.on('ready', () => {
		watcher.on('add', absolutePath => {
			absolutePath = normalize(absolutePath);
			log.verbose(`File added: ${absolutePath}`);
			const file = new File({
				location: absolutePath,
				directory: this.files.inputDir,
				url: this.data.site.url,
				tempFolder: this.files.tempDir,
				compiler: this._hbs.generateCompiler.bind(this._hbs)
			});
			file.write(this.files.outputDir);
			this.docs.core.push(file);
		});

		watcher.on('change', absolutePath => {
			absolutePath = normalize(absolutePath);
			log.verbose(`File changed: ${absolutePath}`);
			let check = false;
			if (absolutePath.includes(this.files.layoutsDir) || absolutePath.includes(this.files.partialsDir)) {
				log.info('Layout or partial change detected, rebuilding everything');
				check = true;
			}

			this.docs.core.forEach(file => {
				if (check || file.path === absolutePath) {
					log.info(`Rebuilding File ${file.path}`);
					file.reload('write');
				}
			});
		});

		watcher.on('remove', absolutePath => {
			absolutePath = normalize(absolutePath);
			log.verbose(`File removed:${absolutePath}`);
			log.info(`Removing File ${absolutePath}`);
			let index = -1;
			this.docs.core.forEach((file, idx) => {
				if (file.path === absolutePath) {
					index = idx;
				}
			});

			if (index > 0) {
				const {wroteTo} = this.docs.core[index];
				if (wroteTo) {
					unlink(wroteTo);
					// @todo: remove directory if empty
				}

				this.docs.core.splice(index, 0);
			}
		});
	});

	this.exitActions = [() => {
		log.verbose('Disabling folder watch');
		watcher.close();
	}];

	return this;
};
