const {randomBytes} = require('crypto');

module.exports = function randomHex(number = 10) {
	const bytes = Math.ceil(number / 2);
	return randomBytes(bytes).toString('hex').substr(0, number);
};
