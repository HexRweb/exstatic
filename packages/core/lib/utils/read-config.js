const {resolve} = require('path');
const {readFile} = require('fs-extra');
const log = require('../log');
const t = require('../translations');

module.exports = async function readConfig(basedir) {
	let data;
	let file;

	try {
		file = resolve(basedir, './_config.json');
		// Bypass require cache
		data = await readFile(file);
		data = JSON.parse(data);
		log.info(t('Exstatic.using_config', {ext: 'json'}));
		return {data, file};
	} catch (error) {
		if (error.code !== 'ENOENT') {
			log.error(t('Exstatic.config_parsing_failed', {ext: 'json', code: error.code}));
		}
	}

	const yaml = require('js-yaml');

	try {
		file = resolve(basedir, './_config.yml');
		data = await readFile(file);
		data = yaml.safeLoad(data);
		log.info(t('Exstatic.using_config', {ext: 'yml'}));
		return {data, file};
	} catch (error) {
		if (error.code !== 'ENOENT') {
			log.error(t('Exstatic.config_parsing_failed', {ext: 'yml', code: error.code}));
		}
	}

	try {
		file = resolve(basedir, './_config.yaml');
		data = await readFile(file);
		data = yaml.safeLoad(data);
		log.info(t('Exstatic.using_config', {ext: 'yaml'}));
		return {data, file};
	} catch (error) {
		if (error.code !== 'ENOENT') {
			log.error(t('Exstatic.config_parsing_failed', {ext: 'yaml', code: error.code}));
		}
	}

	return {
		data: {},
		file: null
	};
};
