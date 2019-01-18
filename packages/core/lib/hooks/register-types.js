'use strict';

module.exports = function registerTypes(results, defaults) {
	const types = {};

	Object.keys(defaults).forEach(type => {
		types[type.name] = type;
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
