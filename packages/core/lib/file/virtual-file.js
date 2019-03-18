const assert = require('assert');
const path = require('path');
const {normalize, file} = require('../utils');
const AbstractFile = require('./abstract-file');

const {fileName} = file;

module.exports = class VirtualFile extends AbstractFile {
	constructor(options = {}) {
		super(options);

		assert.ok(options.meta);
		assert.ok(options.data);

		this.meta = options.meta;
		this.rendered = options.data;
		this.filename = normalize(path.resolve(this.output, fileName(this.source, Boolean(this.meta.path))));
	}

	read() {
		return this;
	}
};
