const HOOKS = [
	'register-types',
	'load-pages',
	'register-helpers',
	'pre-write'
];
const SYNC_HOOKS = ['pre-write'];

const resolvers = {};

function resolverFor(hookName) {
	hookName = hookName.replace(/_/g, '-');

	if (resolvers[hookName]) {
		return resolvers[hookName];
	}

	resolvers[hookName] = require(`./${hookName}`);

	return resolvers[hookName];
}

module.exports = function registerHooks(manager) {
	HOOKS.forEach(
		hook => manager.addHook(hook, SYNC_HOOKS.includes(hook), resolverFor(hook))
	);
};
