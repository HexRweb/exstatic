const {resolve} = require('path');
const Promise = require('bluebird');
const {ensureDirSync: ensureDir} = require('fs-extra');

module.exports = class FileManager {
	constructor({
		inputDir = 'src/',
		outputDir = 'dist/',
		layoutsDir = '{input}/views',
		partialsDir = '{input/views/partials'
	}, instance) {
		layoutsDir = layoutsDir.replace('{input}', inputDir);
		partialsDir = partialsDir.replace('{input}', inputDir);

		this.instance = instance;
		this.dir = process.cwd();

		this.tempDir = resolve(this.dir, '.exstatic');
		this.inputDir = resolve(this.dir, inputDir);
		this.outputDir = resolve(this.dir, outputDir);
		this.layoutsDir = resolve(this.dir, layoutsDir);
		this.partialsDir = resolve(this.dir, partialsDir);

		ensureDir(this.tempDir);
	}
};
