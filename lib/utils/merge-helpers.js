'use strict';

module.exports = function mergeHelpers(core, additions = {}, prefix = '(internal)') {
	Object.getOwnPropertyNames(additions).forEach(addition => {
		if (core[addition]) {
			addition = `${prefix}-${addition}`;
		}

		core[addition] = additions[addition];
	});

	return core;
};
