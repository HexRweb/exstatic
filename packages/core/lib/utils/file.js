const path = require('path');
const slugify = require('slugify');
const normalize = require('./normalize');

function urlPath(override = false, root, path) {

	if (override) {
		return path.resolve('/', this.meta.path);
	}

	return path.relative(root, path);
}


function title(override = false, urlPath) {
	if (override) {
		return override;
	}

	// @todo: determine behavior of path.basename for index files
	// Converts e.g. what-is_life.html -> what is life
	return path.basename(urlPath).replace(/[-_]/g, ' ').split('.')[0];
}

function fileName(urlPath) {
	urlPath = normalize(urlPath).toLowerCase();
	urlPath = urlPath.replace('/index.html', '');

	// Make url-friendly
	urlPath = slugify(urlPath, {
		// See https://github.com/simov/slugify/issues/13
		remove: /[^\w\s$*_+~.()'"!\-:@/\\]/g
	});

	// Clear slashes
	urlPath = urlPath.replace(/^\/|\/$/, '');

	// Make sure the file extension is `.html` in its own directory
	if (!urlPath.endsWith('.html') && !urlPath.match(/\.[\w]+$/)) {
		// urlPath = `${urlPath.replace(/\.[\w]+$/i, '')}/index.html`;
		urlPath += '/index.html';
	}

	return urlPath.replace(/\/\/+/g, '/');
}

module.exports = {
	urlPath,
	title,
	fileName
};
