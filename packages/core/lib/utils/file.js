const path = require('path');
const slugify = require('slugify');
const normalize = require('./normalize');

function urlPath(override = false, root, filePath) {
	let resolved = override;

	if (override) {
		resolved = path.resolve('/', filePath);
	} else {
		resolved = path.relative(root, filePath);
	}

	return resolved.replace(/\.hbs$/i, '.html');
}


function title(override = false, urlPath) {
	if (override) {
		return override;
	}

	// @todo: determine behavior of path.basename for index files
	// Converts e.g. what-is_life.html -> what is life
	return path.basename(urlPath).replace(/[-_]/g, ' ').split('.')[0];
}

function fileName(urlPath, explicit = false) {
	urlPath = normalize(urlPath).toLowerCase();
	urlPath = urlPath.replace('/index.html', '');

	// Make url-friendly
	urlPath = slugify(urlPath, {
		// See https://github.com/simov/slugify/issues/13
		remove: /[^\w\s$*_+~.()'"!\-:@/\\]/g
	});

	// Clear slashes
	urlPath = urlPath.replace(/^\/|\/$/, '');

	// Give the path it's own directory
	if (!explicit && !urlPath.match(/\/?index\.html$/i)) {
		urlPath = `${urlPath.replace(/\.html$/i, '')}/index.html`;
	}

	return urlPath.replace(/\/\/+/g, '/');
}

module.exports = {
	urlPath,
	title,
	fileName
};
