const path = require('path');
const assert = require('assert');
const {ensureDir, writeFile} = require('fs-extra');
const {normalize, file: {fileName}} = require('../utils');

module.exports = class AbstractFile {
	constructor(options = {}) {
		assert.ok(options.writePath);
		assert.ok(options.location);
		this.written = false;

		this.writePath = normalize(options.writePath);
		this.source = normalize(path.resolve(this.dir, options.location));
		this.filename = normalize(path.resolve(this.writePath, fileName(this.source)));
	}

	read() {
		return this;
	}

	compile() {
		return this;
	}

	async save(reWrite = false) {
		if (this.written && !reWrite) {
			return this;
		}

		const saveLocation = path.resolve(this.writePath, this.filename);

		await ensureDir(path.dirname(saveLocation));
		await writeFile(saveLocation, this.compiled);
		this.written = true;
		return this;
	}

	async reload() {
		this.written = false;
		await this.read();
		return this;
	}
};
