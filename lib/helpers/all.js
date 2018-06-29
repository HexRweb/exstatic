const get = require('lodash.get');

function isValidCheck(check) {
	return ['site', 'page'].includes(check.split('.')[0]);
}

module.exports = function all(options) {
	let allMatch = true;

	if (options.hash.truthy) {
		const checks = options.hash.truthy.split(',');
		checks.forEach(check => {
			// Adding the allMatch check for performance
			// We only want to evaluate truthiness for valid paths
			if (allMatch && isValidCheck(check) && !get(options.data, check, false)) {
				allMatch = false;
			}
		});
	}

	Object.keys(options.hash).forEach(obj => {
		if (allMatch && !(options.data.root.hasOwnProperty(obj) &&
			options.data.root[obj].toString() === options.hash[obj].toString())
		) {
			allMatch = false;
		}
	});

	if (allMatch) {
		return options.fn(this);
	}

	return options.inverse(this);
};
