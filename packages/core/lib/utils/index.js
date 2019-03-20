const {ensureArray, url, normalizePath: normalize} = require('@exstatic/utils');

module.exports = {
	ensureArray,
	normalize,
	url,

	get file() {
		return require('./file');
	},

	get registerFileHooks() {
		return require('./file-hook');
	},

	get getAllFiles() {
		return require('./get-all-files');
	},

	get mergeHelpers() {
		return require('./merge-helpers');
	},

	get readConfig() {
		return require('./read-config');
	},

	get yamlParser() {
		return require('./yaml-parser');
	}
};
