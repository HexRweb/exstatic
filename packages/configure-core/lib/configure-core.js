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
		registerHook('post-page_generation', (...args) => this.hookCreated(...args));
		registerHook('pre-write', (...args) => this.hookWrite(...args));
	}

	hookCreated(files) {
		// Add a guard in case write method is not properly implemented
		let newFiles = this.pagesCreated(files);
		return newFiles || files;
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

	pagesCreated(files) {
		// Modify file list after compilation. One usecase for this is sitemap generation
		return files;
	}

	write(files) {
		// Modify files before they're written, noop
		return files;
	}
}
