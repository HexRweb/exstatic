const assert = require('assert');
const AbstractFile = require('./abstract-file');

module.exports = class VirtualFile extends AbstractFile {
	constructor(options = {}) {
		super();

		assert.ok(options.meta);
		this.meta = options.meta;
	}
};
