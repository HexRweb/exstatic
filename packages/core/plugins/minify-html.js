const {minify} = require('html-minifier');

class HTMLMinifier {
	constructor(options) {
		this.minify = minify;
		this.init(options);
	}

	init(options = {}) {
		this.opts = Object.assign({
			minifyCSS: true,
			minifyJS: true,
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
			file.compiled = Buffer.from(this.minify(file.compiled.toString(), this.opts));
		});

		return fileList;
	}
}

module.exports = new HTMLMinifier();
