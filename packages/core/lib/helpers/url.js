// @todo: add support for relative urls
// @todo: add support for stripping text
module.exports = function url(location) {
	const {SafeString} = this.instance._hbs;

	location = decodeURI(location);

	if (!location.match(/^\//)) {
		location = `/${location}`;
	}

	location = encodeURI(`${this.instance.data.site.url}${location}`);
	return new SafeString(location);
};
