const Promise = require('bluebird');

module.exports = class FileManager {
	constructor({inputDir, outputDir, layoutsDir, partialsDir}, instance) {
		const inputDir = inputDir || 'src/';
		const outputDir = outputDir || 'dist/';
		const layoutsDir = (layoutsDir || '{input}/views').replace('{input}', inputDir);
		const partialsDir = (partialsDir || '{input}/views/partials').replace('{input}', inputDir);

		this.instance = instance;
		this.dir = process.cwd();

		this.tempDir = path.resolve(this.dir, '.exstatic');
		this.inputDir = path.resolve(this.dir, inputDir);
		this.outputDir = path.resolve(this.dir, outputDir);
		this.layoutsDir = path.resolve(this.dir, layoutsDir);
		this.partialsDir = path.resolve(this.dir, partialsDir);

		ensureDir(this.tempDir);
	}
};
