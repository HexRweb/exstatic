const {normalize} = require('path');

module.exports = function normalizeFilePaths(fileName) {
	return normalize(fileName.replace(/\.\.[\/\\]?/g, '')).replace(/\\/g, '/');
};
