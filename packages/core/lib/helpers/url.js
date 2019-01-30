// @todo: add support for relative urls
// @todo: add support for stripping text
module.exports = function url(location) {
	const {SafeString} = this.instance.hbs;

	location = decodeURI(location);

	if (!location.match(/^\//)) {
		location = `/${location}`;
	}

	if (location.endsWith('/index.html')) {
		location = location.replace(/\/index\.html$/, '/');
	}

	location = encodeURI(`${this.instance.hbs.data('site.url')}${location}`);
	return new SafeString(location);
};
