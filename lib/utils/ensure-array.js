'use strict';

module.exports = function ensureArray(item) {
	if (Array.isArray(item)) {
		return item;
	}

	if (item) {
		return [item];
	}

	return [];
};
