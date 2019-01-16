const {resolve} = require('path');
const {ensureDirSync: ensureDir} = require('fs-extra');
const normalize = require('./utils/normalize');

module.exports = class FileManager {
	constructor({
		inputDir = 'src/',
		outputDir = 'dist/',
		layoutsDir = 'src/views',
		partialsDir = 'src/views/partials'
	}, instance) {
		this.instance = instance;
		this.init({inputDir, outputDir, layoutsDir, partialsDir});
		ensureDir(this.tempDir);
	}

	init({
		inputDir,
		outputDir,
		layoutsDir,
		partialsDir
	}) {
		inputDir = inputDir || this.inputDir;
		outputDir = outputDir || this.outputDir;
		layoutsDir = layoutsDir || this.layoutsDir;
		partialsDir = partialsDir || this.partialsDir;

		layoutsDir = layoutsDir.replace('{input}', inputDir);
		partialsDir = partialsDir.replace('{input}', inputDir);

		this.dir = process.cwd();

		this.tempDir = normalize(resolve(this.dir, '.exstatic'));
		this.inputDir = normalize(resolve(this.dir, inputDir));
		this.outputDir = normalize(resolve(this.dir, outputDir));
		this.layoutsDir = normalize(resolve(this.dir, layoutsDir));
		this.partialsDir = normalize(resolve(this.dir, partialsDir));
	}

	set config(value) {
		this._config = normalize(value);
	}

	get config() {
		return this._config;
	}
};