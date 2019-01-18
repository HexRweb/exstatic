'use strict';

// This is a noop function, but we're leaving it in for consistency, and because all hook management
// might be abstracted to a separate npm module, including resolution
module.exports = function preWriteHookResolver(results) {
	return results;
};
