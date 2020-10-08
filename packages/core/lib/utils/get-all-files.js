const readdir = require('readdirp');
const {normalize} = require('.');

// @todo: don't hardcode extensions
const ALLOWED_EXTENSIONS = new Set(['hbs', 'md']);

const isValidFile = (file, ignorelist) => {
	const extension = file.split('.').pop().toLowerCase();
	if (file.includes('/_') || !ALLOWED_EXTENSIONS.has(extension)) {
		return false;
	}

	for (const ignoredPattern of ignorelist) {
		if (file.includes(ignoredPattern)) {
			return false;
		}
	}

	return true;
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
