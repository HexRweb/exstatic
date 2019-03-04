const path = require('path');
const {normalizePath, fs, error: ExError} = require('@exstatic/utils');

class InvalidString extends String {
	constructor(...args) {
		super(...args);

		this.isInvalid = true;
	}
}

module.exports = class ExstaticCacheFileManager {
	static get manifestVersion() {
		return '0.0.1';
	}

	constructor(options = {}) {
		this.wd = options.root || process.cwd();

		if (!options.namespace) {
			throw new ExError('Namespace must be provided', 'EX_CACHE_MISSING_NAMESPACE');
		}

		options.namespace = normalizePath(options.namespace);

		this.wd = path.resolve(this.wd, options.namespace);
		this.manifestLocation = path.resolve(this.wd, 'cache-manifest.json');
		this.saveScheduled = false;
		this.dirty = false;
		this.lastSaved = -1;
		this.__save = () => this.forceSave();
	}

	async forceSave(sync = false) {
		if (!this.dirty) {
			return false;
		}

		const contents = JSON.stringify(this.manifest, null, 2);

		if (sync) {
			fs.writeFileSync(this.manifestLocation, contents);
		} else {
			await fs.writeFile(this.manifestLocation, contents);
		}

		this.dirty = false;
		this.lastSaved = Date.now();
		this.saveScheduled = false;
	}

	scheduleSave() {
		// Don't schedule a save if there's one scheduled
		if (this.saveScheduled) {
			return this.saveScheduled;
		}

		this.dirty = true;

		// Rate-limit saving to every 2.5 seconds
		if ((Date.now() - this.lastSaved) <= 2500) {
			return this.saveScheduled;
		}

		process.nextTick(this.__save);

		this.saveScheduled = true;
		return true;
	}

	etagPath(etag) {
		const resolvedPath = path.resolve(this.wd, `${etag}.cache`);
		if (path.relative(this.wd, resolvedPath).indexOf('..') >= 0) {
			throw new ExError(`Etag ${etag} resolves outside of working directory`, 'EX_CACHE_NAMESPACE_ESCAPE');
		}

		return resolvedPath;
	}

	async init() {
		await fs.ensureDir(this.wd);

		if (!this.exitScheduled) {
			this.exitScheduled = true;
			process.on('SIGINT', this.__save)
				.on('SIGTERM', this.__save)
				.on('beforeExit', this.__save)
				.on('exit', () => this.forceSave(true));
		}

		try {
			this.manifest = JSON.parse(await fs.readFile(this.manifestLocation, 'utf8'));

			const {version, data} = this.manifest;

			// @todo: add support for migrating
			if (version !== ExstaticCacheFileManager.manifestVersion || !(data instanceof Object)) {
				throw new ExError('Invalid Manifest', 'EX_BAD_MANIFEST');
			}
		} catch (error) {
			if (error instanceof ExError) {
				throw error;
			}

			this.manifest = {data: {}, version: ExstaticCacheFileManager.manifestVersion};
			this.scheduleSave();
		}

		this.valueCache = Object.values(this.manifest.data);
	}

	async add(path, etag, contents) {
		// @note: only update the manifest after data is persisted
		await fs.writeFile(this.etagPath(etag), contents);
		this.manifest.data[path] = etag;
		this.valueCache.push(etag);
		this.scheduleSave();
		return true;
	}

	async removeItem(path, etag) {
		await fs.remove(this.etagPath(etag));
		delete this.manifest.data[path];
		this.valueCache = Object.values(this.manifest.data);
		this.scheduleSave();
		return true;
	}

	removeEtag(etag) {
		for (const [path, value] of Object.entries(this.manifest.data)) {
			if (value === etag) {
				return this.removeItem(path, value);
			}
		}

		return Promise.resolve(false);
	}

	removePath(path) {
		const etag = this.manifest.data[path];
		if (!etag) {
			return false;
		}

		return this.removeItem(path, etag);
	}

	hasEtag(etag) {
		return this.valueCache.includes(etag);
	}

	hasPath(path) {
		return Boolean(this.manifest.data[path]);
	}

	getEtagFromPath(path) {
		return this.manifest.data[path];
	}

	getContents(etag) {
		if (this.hasEtag(etag)) {
			return fs.readFile(this.etagPath(etag), 'utf8').catch(async error => {
				if (error.code === 'ENOENT') { // For whatever reason the etag doesn't exist
					await this.removeEtag(etag);
					return new InvalidString();
				}

				throw error;
			});
		}

		return new InvalidString();
	}
};

module.exports.error = ExError;
module.exports.InvalidString = InvalidString;
