const mergeHelpers = require('../utils/merge-helpers');

module.exports = function preRegisterHook(hookResults, helpers) {
	/*
	** This hook supports 2 types of return values - an object of sync
	** helpers to add, or an object containing (a)sync helpers to add
	*/
	hookResults.forEach(({result: newHelpers, from: plugin}) => {
		if (!newHelpers.sync && !newHelpers.async) {
			mergeHelpers(helpers.sync, newHelpers, plugin);
		} else {
			mergeHelpers(helpers.sync, newHelpers.sync, plugin);
			mergeHelpers(helpers.async, newHelpers.async, plugin);
		}
	});
	return helpers;
};
