module.exports = function makeResolvedUrl(root, path) {
	return new URL(path, root).toString().replace(/\/index\.html$/, '/');
};
