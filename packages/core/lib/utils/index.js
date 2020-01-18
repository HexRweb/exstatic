const {ensureArray, url, normalizePath: normalize, mapAsync, mapSeries, fs} = require('@exstatic/utils');

module.exports = {
	ensureArray,
	fs,
	mapAsync,
	mapSeries,
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
