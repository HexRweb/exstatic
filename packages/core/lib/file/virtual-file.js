const assert = require('assert');
const AbstractFile = require('./abstract-file');

module.exports = class VirtualFile extends AbstractFile {
	constructor(options = {}) {
		assert.ok(this.meta);
		this.meta = options.meta;
	}
}
