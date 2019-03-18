'use strict';

module.exports = class PluginBase {
	constructor(options) {
		this.configure(options);
	}

	configure(options = {}) {
		this.options = options;
	}

	registerHooks(registerHook) {
		registerHook('load-pages', (...args) => this.addPages(...args));
		registerHook('register-helpers', (...args) => this.registerHelpers(...args));
		registerHook('pre-write', (...args) => this.hookWrite(...args));
	}

	async hookWrite(files, ...args) {
		// Add a guard in case write method is not properly implemented
		const newFiles = await this.write(files, ...args);
		return newFiles || files;
	}

	addPages() {
		// Return an array of pages to add, noop
		return [];
	}

	registerHelpers() {
		/*
		* Return a list of helpers to register
		* either {helperA(), helperB(), helperC()} for only synchronous helpers
		* or {
		*	sync: {
		*		helperA(),
		*		helperB(),
		*		helperC()
		*	},
		*	async: {
		*		helperA(),
		*		helperB(),
		*		helperC()
		*	},
		* }
		* noop by default
		*/
		return {};
	}

	write(files) {
		// Modify files before they're written, noop
		return files;
	}
};
