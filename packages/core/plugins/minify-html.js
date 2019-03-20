const {minify} = require('html-minifier');
const PluginBase = require('@exstatic/plugin-base');
const VirtualFile = require('../lib/file/virtual-file');

class PluginMinifyHtml extends PluginBase {
	constructor(options) {
		super(options);
		this.minify = minify;
	}

	get name() {
		return 'minify-html';
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
			if ((file instanceof VirtualFile && !file.meta.minify) || file.meta.minify === false) {
				return;
			}

			file.compiled = Buffer.from(this.minify(file.compiled.toString(), this.options));
		});

		return fileList;
	}
}

module.exports = new PluginMinifyHtml();
