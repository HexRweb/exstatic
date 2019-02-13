const {url} = require('../utils');
// @todo: add support for relative urls
// @todo: add support for stripping text
module.exports = function urlHelper(location) {
	const {SafeString} = this.instance.hbs;

	location = decodeURI(location);
	location = url(this.instance.url, location);
	// @todo: determine if this is necessary
	location = encodeURI(location);
	return new SafeString(location);
};
