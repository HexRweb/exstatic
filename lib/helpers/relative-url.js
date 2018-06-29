const {SafeString, Utils: {escapeExpression: _escape}} = require('handlebars');
module.exports = function relativeURL(location) {
	return new SafeString(`/${_escape(location)}`.replace(/\/\//g, '/'));
};
