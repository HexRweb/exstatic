const TAB = '  ';
const HOOKS = [
	'initialized',
	'load-pages',
	'register-helpers',
	'pre-write'
];
const SYNC_HOOKS = ['pre-write'];

const resolvers = {};

const proxy = fn => (result, ...args) => {
	if (result.errors.length > 0) {
		const error = new Error('Some hooks failed');
		error.stack = '\n' + error.stack.split('\n').shift();
		result.errors.forEach((hookError, index) => {
			error.stack += '\n\n';
			error.stack += `Error ${index + 1}: \n${TAB}`;
			error.stack += hookError.stack.replace(/\n/g, `\n${TAB}`);
		});
		error.stack += '\n';
		throw error;
	}

	return fn(result.results, ...args);
};

function resolverFor(hookName) {
	hookName = hookName.replace(/_/g, '-');

	if (resolvers[hookName]) {
		return resolvers[hookName];
	}

	resolvers[hookName] = proxy(require(`./${hookName}`));

	return resolvers[hookName];
}

module.exports = function registerHooks(manager) {
	HOOKS.forEach(
		hook => manager.addHook(hook, SYNC_HOOKS.includes(hook), resolverFor(hook))
	);
};

module.exports.hooks = HOOKS;
