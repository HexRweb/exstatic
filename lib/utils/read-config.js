const {resolve} = require('path');
const {readFile} = require('fs').promises;
const log = require('../log');
const t = require('../translations');

module.exports = async function readConfig(basedir) {
	let data;

	try {
		data = await require(resolve(basedir, './_config.json'));
		log.info(t('Exstatic.using_config', {ext: 'json'}));
		return data;
	} catch (error) {
		if (error.code !== 'MODULE_NOT_FOUND') {
			log.error(t('Exstatic.config_parsing_failed', {ext: 'json', code: error.code}));
		}
	}

	const yaml = require('js-yaml');

	try {
		data = await readFile(resolve(basedir, './_config.yml'));
		data = yaml.safeLoad(data);
		log.info(t('Exstatic.using_config', {ext: 'yml'}));
		return data;
	} catch (error) {
		if (error.code !== 'ENOENT') {
			log.error(t('Exstatic.config_parsing_failed', {ext: 'yml', code: error.code}));
		}
	}

	try {
		data = await readFile(resolve(basedir, './_config.yaml'));
		data = yaml.safeLoad(data);
		log.info(t('Exstatic.using_config', {ext: 'yaml'}));
		return data;
	} catch (error) {
		if (error.code !== 'ENOENT') {
			log.error(t('Exstatic.config_parsing_failed', {ext: 'yaml', code: error.code}));
		}
	}

	return {};
};
