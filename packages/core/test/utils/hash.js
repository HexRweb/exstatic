const {createHash} = require('crypto');

module.exports = function hash(data) {
	return createHash('sha256').update(data).digest('base64');
};
