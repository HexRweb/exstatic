const axios = require('axios');
const {cache: Cache} = require('@exstatic/meta-manager');

class ExstaticSource {
	constructor() {
		this.request = axios.create();
		this.store = new Cache({namespace: this.name});
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
