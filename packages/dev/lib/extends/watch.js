const chokidar = require('chokidar');
const {Exstatic} = require('@exstatic/core');
const {log} = require('@exstatic/logging');
const {normalizePath: normalize, fs} = require('@exstatic/utils');

const replaceAndNormalize = (input, bad) => input.replace(bad, '').replace(/^\/+/, '').replace(/\/+$/, '');

const isConfig = (instance, fullPath) => fullPath.includes(instance.fm.config);
const isLayout = (instance, fullPath) => fullPath.includes(instance.fm.layoutsDir);
const isPartial = (instance, fullPath) => fullPath.includes(instance.fm.partialsDir);

const removePageRoot = (instance, fullPath) => replaceAndNormalize(fullPath, instance.fm.inputDir);
const removeLayoutRoot = (instance, fullPath) => replaceAndNormalize(fullPath, instance.fm.layoutsDir);
const removePartialRoot = (instance, fullPath) => replaceAndNormalize(fullPath, instance.fm.partialsDir);

async function handleAdd(absolutePath) {
	absolutePath = normalize(absolutePath);

	if (isLayout(absolutePath)) {
		return log.info(`Layout added: ${removeLayoutRoot(this, absolutePath)}`);
	}

	if (isPartial(absolutePath)) {
		return log.info(`Partial added: ${removePartialRoot(this, absolutePath)}`);
	}

	log.info(`Page added: ${removePageRoot(this, absolutePath)}`);

	const file = this.fm.addFile(absolutePath);
	this.refreshFile(file);
}

function handleChange(absolutePath) {
	absolutePath = normalize(absolutePath);

	if (isConfig(this, absolutePath)) {
		log.info('Config file changed, reloading');
		return this.events.emit('TRIGGER_RESTART');
	}

	if (isLayout(this, absolutePath)) {
		log.info(`Layout ${removeLayoutRoot(this, absolutePath)} changed; rebuilding everything`);
		return this.refreshAll();
	}

	if (isPartial(this, absolutePath)) {
		log.info(`Partial ${removePartialRoot(this, absolutePath)} changed; rebuilding everything`);
		return this.refreshAll();
	}

	log.info(`Refreshing page ${removePartialRoot(this, absolutePath)}`);
	return this.refreshFile(absolutePath);
}

async function handleUnlink(absolutePath) {
	absolutePath = normalize(absolutePath);
	const layoutChanged = isLayout(this, absolutePath);
	const partialChanged = isPartial(this, absolutePath);

	if (layoutChanged || partialChanged) {
		const meta = layoutChanged ? `Layout ${removeLayoutRoot(this, absolutePath)}` :
			`Partial ${removePartialRoot(this, absolutePath)}`;
		log.info(`${meta} removed; rebuilding everything`);

		return Promise.all(this.fm.files.map(file => {
			log.info(`Rebuilding file ${removePageRoot(this, file.source)}`);
			return file.reload();
		}));
	}

	const index = this.fm.files.findIndex(file => file.source === absolutePath);

	if (index < 0) {
		return;
	}

	log.info(`Removed ${removePageRoot(this, absolutePath)}`);
	const file = this.fm.files[index];
	this.fm.files.splice(index, 1);

	if (file.filename) {
		await fs.unlink(file.filename).catch(() => true);
		// @todo: remove directory if empty
	}

	if (file.tempContext) {
		await file.temp.release(file.tempContext);
	}
}

module.exports = function watchForChanges() {
	if (!(this instanceof Exstatic)) {
		throw new TypeError('Incorrect usage of watch - did not received Exstatic instance');
	}

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
		watcher.on('add', handleAdd.bind(this));
		watcher.on('change', handleChange.bind(this));
		watcher.on('unlink', handleUnlink.bind(this));

		log.info(`Watching:\n\t- ${foldersToWatch.join('\n\t- ')}`);
		log.info('Waiting for changes');
	});

	this.exitActions.push(() => watcher.close());
	return this;
};
