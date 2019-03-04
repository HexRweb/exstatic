const axios = require('axios');
const {debug} = require('@exstatic/logging');
const {cache: Cache} = require('@exstatic/meta-manager');

class ExstaticSource {
	constructor() {
		this.request = axios.create(this.defaults);
		this.store = new Cache({namespace: this.name});
		this.httpDebug = debug(`http:source-${this.name}`);
		this.debug = debug(`source-${this.name}`);
	}

	init() {
		return this.store.init();
	}

	async updateStoreIfNeeded(apiResponse, currentEtag) {
		if (currentEtag && apiResponse.status === 304) {
			this.httpDebug('Reading content from cache');
			apiResponse.data = await this.store.getContents(currentEtag);
		} else if (apiResponse.status === 200) {
			this.httpDebug('Got new content from github');
			await this.store.removeEtag(currentEtag);
		}
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
