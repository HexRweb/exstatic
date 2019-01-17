'use strict';
const path = require('path');
const Promise = require('bluebird');
let {readdir, stat} = require('fs-extra');
const normalize = require('./normalize');

readdir = Promise.promisify(readdir);

// @todo: don't hardcode extensions
const ALLOWED_EXTENSIONS = ['hbs', 'md'];

const isValidFile = (file, blacklist) => {
	const extension = file.split('.').pop().toLowerCase();
	if (file.includes('/_') || !ALLOWED_EXTENSIONS.includes(extension)) {
		return false;
	}

	return blacklist.reduce((state, bad) => {
		if (file.indexOf(bad) >= 0) {
			return false;
		}

		return state;
	}, true);
}

async function getAllFiles(dir, blacklist = []) {
	let dirContents = await readdir(dir);

	return Promise.map(dirContents, async fileName => {
		fileName = path.resolve(dir, fileName);
		const fileInfo = await stat(fileName);
		if (fileInfo.isDirectory()) {
			return getAllFiles(fileName, blacklist);
		}

		return normalize(fileName);
	})
	.reduce((a, b) => a.concat(b), [])
	.filter(file => isValidFile(file, blacklist));
}

module.exports = getAllFiles;
