const path = require('path');
const {random, fs, error: ExError, normalizePath: normalize} = require('@exstatic/utils');
const FileContext = require('./file-context');

module.exports = class ExstaticTempFileManager {
	constructor(options = {}) {
		const wd = options.root || process.cwd();
		this.root = path.resolve(wd, '.exstatic', 'tmp');
		this.fileList = new Map();
	}

	init() {
		return fs.ensureDir(this.root);
	}

	acquire(context = '') {
		if (!context) {
			let tries = 0;

			do {
				context = random();
			} while (++tries <= 100 && this.fileList.get(context) instanceof FileContext);

			if (this.fileList.get(context) instanceof FileContext) {
				throw new ExError('Unable to generate context id in reasonable time', 'EX_NO_CONTEXT');
			}
		}

		context = normalize(context);

		const existingContext = this.fileList.get(context);
		if (existingContext) {
			existingContext.flush();
			return existingContext;
		}

		const newContext = new FileContext(path.resolve(this.root, context));
		this.fileList.set(context, newContext);
		return newContext;
	}

	release(contextKey = '') {
		if (!contextKey) {
			throw new ExError('Context must be supplied', 'EX_NO_CONTEXT');
		}

		const context = this.fileList.get(contextKey);

		if (!context) {
			throw new ExError(`Context ${contextKey} does not exist`, 'EX_CONTEXT_NOT_FOUND');
		}

		this.fileList.delete(contextKey);
		return context.destroy();
	}

	releaseAll() {
		const promises = [];

		for (const [_, context] of this.fileList) { // eslint-disable-line no-unused-vars
			promises.push(context.destroy());
		}

		this.fileList.clear();
		return Promise.all(promises);
	}
};
