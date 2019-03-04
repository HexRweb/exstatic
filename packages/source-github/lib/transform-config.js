const GError = require('./error');

module.exports = function transformConfig(config, requiredAttrs = []) {
	if (config.repository) {
		[config.user, config.project] = config.repository.split('/');
		delete config.repository;
	}

	for (const attr of requiredAttrs) {
		if (!(attr in config)) {
			throw new GError(`${attr} must be supplied`, 'EGS_MISSING_PARAM');
		}
	}
};
