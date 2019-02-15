const {minify} = require('html-minifier');
const PluginBase = require('@exstatic/plugin-base');

class PluginMinifyHtml extends PluginBase {
	constructor(options) {
		super(options);
		this.minify = minify;
	}

	configure(options = {}) {
		this.options = Object.assign({
			minifyCSS: true,
			minifyJS: true,
			collapseWhitespace: true,
			removeComments: true
		}, options);
	}

	write(fileList) {
		fileList.forEach(file => {
			file.compiled = Buffer.from(this.minify(file.compiled.toString(), this.options));
		});

		return fileList;
	}
}

module.exports = new PluginMinifyHtml();
