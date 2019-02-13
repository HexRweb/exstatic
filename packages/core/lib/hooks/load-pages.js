const {ensureArray} = require('../utils');

// @note: this function mutates the provided array
module.exports = function mergeLocalAndVirtualPages(hookResults, docs) {
	hookResults.forEach(({result}) =>
		ensureArray(result).forEach(newPage => docs.push(newPage))
	);
};
