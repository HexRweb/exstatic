'use strict';

module.exports = class ConfigureCore {
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

	hookWrite(files) {
		// Add a guard in case write method is not properly implemented
		let newFiles = this.write(files);
		return newFiles || files;
	}

	addPages() {
		// return an array of pages to add, noop
		return [];
	}

	registerHelpers() {
		/*
		* return a list of helpers to register
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
}
