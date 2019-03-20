const path = require('path');
const {log} = require('@exstatic/logging');
const {hooks} = require('../hooks');

function defaultFileName(hook) {
	switch (hook) {
		case 'initialized':
			return 'init';
		case 'pre-write':
			return 'before-write';
		case 'load-pages':
			return 'add-pages';
		default:
			return hook;
	}
}

function loadFn(absolutePath) {
	let fn;
	try {
		fn = require(absolutePath);
	} catch (error) {
		return error;
	}

	if (typeof fn === 'function') {
		return fn;
	}

	return null;
}

module.exports = function addFsHooks(register, instance) {
	hooks.forEach(hook => {
		log.verbose(`Loading project hook: ${hook}`);
		const defaultName = defaultFileName(hook);
		const configHookName = `on-${defaultName}`;
		const defaultFilePath = `./exstatic-${defaultName}`;
		const defaultFile = path.resolve(instance.fm.dir, defaultFilePath);

		let fn;
		const configValue = instance.__config[configHookName];
		if (configValue) {
			// Determine the absolute path to the local file based on the directory we are running in
			const configuredFile = path.resolve(instance.fm.dir, configValue);
			fn = loadFn(configuredFile);

			// CASE: Failed to load module - warn and try to load default module
			if (fn instanceof Error) {
				log.warn(`Failed to load on-${configHookName} module - ${fn.message}`);
				// CASE: default module IS the configured module - trying to load the default module would be pointless
				if (defaultFile === configuredFile) {
					return;
				}
			// CASE: Module was properly defined - register the hook and go to next
			} else if (typeof fn === 'function') {
				log.info(`Adding ${hook} hook for ${configValue}`);
				return register(hook, fn);
			// CASE: Successfully loaded module, but it didn't export a function
			} else {
				log.warn(`${configHookName} module is not valid. It exported a(n) ${typeof fn}, but should have exported a function.`);
				if (defaultFile === configuredFile) {
					return;
				}
			}
		}

		fn = loadFn(defaultFile);

		// CASE: failed to load the default module - no need to inform the user
		if (fn instanceof Error) {
			return;
		}

		if (typeof fn === 'function') {
			log.info(`Adding ${hook} hook for ${defaultFilePath}`);
			return register(hook, fn);
		}

		log.warn(`${configHookName} module is not valid. It exported a(n) ${typeof fn}, but should have exported a function.`);
	});
};
