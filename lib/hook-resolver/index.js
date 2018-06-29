const resolvers = {};
const Promise = require('bluebird');

let binder;

resolvers['pre-register_helpers'] = require('./pre-register-helpers');
resolvers['post-document_generation'] = require('./post-document-generation');

module.exports = function resolveHook(name, ...args) {
	if (resolvers[name]) {
		return Promise.resolve(resolvers[name].call(binder, ...args));
	}

	return Promise.reject(new Error(`Unknown Hook: ${name}`));
};

module.exports.init = function init(caller) {
	binder = caller;
};
