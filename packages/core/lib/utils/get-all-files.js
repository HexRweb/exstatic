const Promise = require('bluebird');
const readdir = Promise.promisify(require('readdirp'));
const {normalize} = require('.');

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
};

async function getAllowedFiles(dir, blacklist = []) {
	const {files} = await readdir({root: dir, entryType: 'files'});
	return files
		.map(({fullPath}) => normalize(fullPath))
		.filter(file => isValidFile(file, blacklist));
}

module.exports = getAllowedFiles;
