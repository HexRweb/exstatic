'use strict';
const path = require('path');
const Promise = require('bluebird');
let {readdir, stat} = require('fs-extra');

readdir = Promise.promisify(readdir);

function isValidFile(file, blacklist) {
	return blacklist.reduce((isValid, item) => {
		let expValid = !item.expression.test(file);
		if (item.invert) {
			expValid = !expValid;
		}
		return isValid && expValid;
	}, true);
}

function getAllFiles(dir, blacklist = []) {
	blacklist = blacklist.map(item => {
		if (!item.expression) {
			item = {expression: item, invert: false};
		}

		item.expression = new RegExp(item.expression, 'i');

		return item;
	});

	return Promise.resolve(readdir(dir)).map(fileName => {
		if (!isValidFile(fileName, blacklist)) {
			return false;
		}

		fileName = path.resolve(dir, fileName);
		return stat(fileName).then(fileInfo => {
			if (fileInfo.isDirectory()) {
				return getAllFiles(fileName);
			}

			return fileName;
		});
	}).filter(Boolean).reduce((a, b) => a.concat(b), []);
}

module.exports = getAllFiles;