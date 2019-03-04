const axios = require('axios');
const {cache: Cache} = require('@exstatic/meta-manager');

class ExstaticSource {
	constructor() {
		this.request = axios.create(this.defaults);
		this.store = new Cache({namespace: this.name});
	}

	init() {
		return this.store.init();
	}

	static replaceParams(string, params) {
		return Object.entries(params).reduce(
			(str, [key, value]) => str.replace(new RegExp(`:${key}`, 'g'), value),
			string
		);
	}

	get defaults() {
		return ExstaticSource.defaults;
	}

	static get defaults() {
		return {
			'user-agent': 'exstatic-source-bot https://github.com/hexrweb/exstatic',
			responseType: 'json'
		};
	}

	get name() {
		throw new Error('Name was not implemented');
	}

	/* istanbul ignore next */
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
module.exports.InvalidString = Cache.InvalidString;
module.exports.Error = class SourceError extends Error {
	constructor(msg, code) {
		super(msg);
		this.code = code;
	}
};
