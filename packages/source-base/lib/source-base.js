const axios = require('axios');

class ExstaticSource {
	constructor() {
		this.request = axios.create();
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

	run() {
		throw new Error('Run was not implemented');
	}

	registerHooks(registerHook) {
		registerHook('pre-register_helpers', () => this.register());
	}

	register() {
		return {
			async: {
				[this.name]: (...args) => this.run(...args)
			}
		};
	}
}

module.exports = ExstaticSource;
