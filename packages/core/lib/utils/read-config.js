const {resolve} = require('path');
const {log} = require('@exstatic/logging');
const {readFile} = require('@exstatic/utils').fs;
const t = require('../translations');
const {loadYaml} = require('.');

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

	/* eslint-disable no-await-in-loop */
	for (const ext of ['yml', 'yaml']) {
		const file = resolve(basedir, `./_config.${ext}`);
		try {
			data = await loadYaml(file);
			log.info(t('Exstatic.using_config', {ext}));
			return {data, file};
		} catch (error) {
			const {code} = error;

			if (code !== 'ENOENT') {
				log.error(t('Exstatic.config_parsing_failed', {ext, code}));
			}
		}
	}
	/* eslint-enable no-await-in-loop */

	return {
		data: {},
		file: null
	};
};
