const axios = require('axios');

class ExstaticSource {
	constructor() {
		this.request = axios;
	}

	get name() {
		throw new Error('Name was not implemented');
	}

	set name(_) {
		return false;
	}

	configure() {
		throw new Error('Configure was not implemented');
	}

	registerHooks(registerHook) {
		registerHook('pre-register_helpers', () => this.register());
	}

	register() {
		return {
			async: {
				[this.name]: (...args) => this.run.apply(this, args)
			}
		};
	}
}

module.exports = new ExstaticSource();
