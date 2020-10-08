const {resolve} = require('path');
const {tmp: TemporaryManager} = require('@exstatic/meta-manager');
const {normalize} = require('./utils');
const {File} = require('./file');

module.exports = class FileManager {
	constructor({
		inputDir = 'src/',
		outputDir = 'dist/',
		layoutsDir = 'src/views',
		partialsDir = 'src/views/partials'
	}, instance) {
		this.instance = instance;
		this.initSyncOnly({inputDir, outputDir, layoutsDir, partialsDir});
		this.files = [];
	}

	initSyncOnly({
		inputDir,
		outputDir,
		layoutsDir,
		partialsDir
	} = {}) {
		inputDir = inputDir || this.inputDir;
		outputDir = outputDir || this.outputDir;
		layoutsDir = layoutsDir || this.layoutsDir;
		partialsDir = partialsDir || this.partialsDir;

		layoutsDir = layoutsDir.replace('{input}', inputDir);
		partialsDir = partialsDir.replace('{input}', inputDir);

		this.dir = process.cwd();
		this.inputDir = normalize(resolve(this.dir, inputDir));
		this.outputDir = normalize(resolve(this.dir, outputDir));
		this.layoutsDir = normalize(resolve(this.dir, layoutsDir));
		this.partialsDir = normalize(resolve(this.dir, partialsDir));
	}

	async init(options) {
		this.initSyncOnly(options);
		const temporaryDir = normalize(resolve(this.dir, '.exstatic', 'tmp'));

		if (this.temp) {
			await this.temp.releaseAll();
		}

		this.temp = new TemporaryManager({root: temporaryDir});
		return this.temp.init();
	}

	shutdown() {
		if (this.temp) {
			return this.temp.releaseAll();
		}
	}

	get config() {
		return this._config;
	}

	set config(value) {
		this._config = value ? normalize(value) : value;
	}

	resolve(segment) {
		if (segment.startsWith('./')) {
			return resolve(this.dir, segment);
		}

		return segment;
	}

	// Proxy method for file instances to use
	get url() {
		return this.instance.url;
	}

	file(path) {
		path = normalize(resolve(this.inputDir, path));

		return this.files.find(file => file.source === path);
	}

	addFile(source, load = false) {
		const existingFile = this.file(source);
		if (existingFile) {
			return existingFile;
		}

		const newFile = new File({
			source,
			fileManager: this,
			compiler: this.instance.hbs.generateCompiler.bind(this.instance.hbs)
		});

		this.files.push(newFile);

		if (load) {
			return newFile.read();
		}

		return newFile;
	}
};
