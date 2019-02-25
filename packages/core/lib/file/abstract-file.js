const path = require('path');
const assert = require('assert');
const {ensureDir, writeFile} = require('@exstatic/utils').fs;
const {normalize, file: {fileName}} = require('../utils');

module.exports = class AbstractFile {
	constructor(options = {}) {
		assert.ok(options.source);
		assert.ok(options.fileManager);
		this.written = false;
		this.writeProperty = 'rendered';

		this.parent = options.fileManager;
		this.source = options.source;
		this.filename = normalize(path.resolve(this.output, fileName(this.source)));
	}

	// Proxy methods for fs-related directories
	get input() {
		return this.parent.inputDir;
	}

	get temp() {
		return this.parent.tempDir;
	}

	get output() {
		return this.parent.outputDir;
	}

	read() {
		this.rendered = '';
		return this;
	}

	compile() {
		return this;
	}

	async save(reWrite = false) {
		if (this.written && !reWrite) {
			return this;
		}

		const saveLocation = path.resolve(this.output, this.filename);

		await ensureDir(path.dirname(saveLocation));
		await writeFile(saveLocation, this[this.writeProperty]);
		this.written = true;
		return this;
	}

	async reload() {
		this.written = false;
		await this.read();
		return this;
	}
};
