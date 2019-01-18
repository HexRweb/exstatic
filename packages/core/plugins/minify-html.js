'use strict';

const {minify} = require('html-minifier');

class HTMLMinifier {
	constructor(options) {
		this.minify = minify;
		this.init(options);
	}

	init(options = {}) {
		this.opts = Object.assign({
			collapseWhitespace: true,
			removeComments: true
		}, options);

		return this.opts;
	}

	registerHooks(registerHook) {
		registerHook('pre-write', this.minifyFiles.bind(this));
	}

	minifyFiles(fileList) {
		fileList.forEach(file => {
			file.rendered = this.minify(file.rendered, this.opts);
		});

		return fileList;
	}
}

module.exports = new HTMLMinifier();
