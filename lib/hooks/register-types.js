'use strict';

module.exports = function registerTypes(results, defaults) {
	const types = {};

	defaults.forEach(_default => {
		types[_default.name] = _default;
	});

	results.forEach(({result, from}) => {
		// @todo: Add validation
		if (types[result.name]) {
			result.name = `${from}-${result.name}`;
		}

		types[result.name] = result;
	});

	return types;
};
