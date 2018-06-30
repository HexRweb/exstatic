'use strict';

class Hook {
	constructor(fn, caller = '(internal)') {
		this.fn = fn;
		this.caller = caller;
	}

	execute(...args) {
		return this.executeSync(...args).then(result => ({
			from: this.caller,
			result
		}));
	}

	executeSync(...args) {
		const result = this.fn(...args);
		return (typeof result.then === 'function') ? result : Promise.resolve(result);
	}
}

module.exports = Hook;
