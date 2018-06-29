'use strict';

class Hook {
	constructor(fn, caller = '(internal)') {
		this.fn = fn;
		this.caller = caller;
	}

	execute(...args) {
		const result = this.fn(...args);
		const promise = (typeof result.then === 'function') ? result : Promise.resolve(result);

		return promise.then(finalResult => ({
			from: this.caller,
			result: finalResult
		}));
	}
}

module.exports = Hook;
