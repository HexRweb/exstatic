const {ensureArray} = require('../utils');
const {AbstractFile, coerce} = require('../file');

// @note: this function mutates the provided array
module.exports = function mergeLocalAndVirtualPages(hookResults, docs, instance) {
	hookResults.forEach(({result}) =>
		ensureArray(result).forEach(newPage => {
			if (newPage instanceof AbstractFile) {
				return docs.push(newPage)
			}

			docs.push(coerce(newPage, instance));
		})
	);
};
