const {resolve} = require('path');
const {ensureDirSync: ensureDir} = require('fs-extra');

module.exports = class FileManager {
	constructor({
		inputDir = 'src/',
		outputDir = 'dist/',
		layoutsDir = '{input}/views',
		partialsDir = '{input/views/partials'
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

		this.tempDir = resolve(this.dir, '.exstatic');
		this.inputDir = resolve(this.dir, inputDir);
		this.outputDir = resolve(this.dir, outputDir);
		this.layoutsDir = resolve(this.dir, layoutsDir);
		this.partialsDir = resolve(this.dir, partialsDir);
	}
};
