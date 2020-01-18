const readdir = require('readdirp');
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
	const validFiles = [];
	const fileFilter = ({fullPath}) => isValidFile(normalize(fullPath), blacklist);

	for await (const entry of readdir(dir, {fileFilter})) {
		validFiles.push(normalize(entry.fullPath));
	}

	return validFiles;
}

module.exports = getAllowedFiles;
