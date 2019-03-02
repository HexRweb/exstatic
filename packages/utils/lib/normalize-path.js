const {normalize} = require('path');

module.exports = function normalizeFilePaths(fileName) {
	// eslint-disable-next-line no-useless-escape
	return normalize(fileName.replace(/\.\.[\/\\]?/g, '')).replace(/\\/g, '/');
};
