const GError = require('./error');

module.exports = function handlePossibleRateLimit(error) {
	if (!error.response) {
		throw error;
	}

	const {headers} = error.response;
	if (!headers || headers['x-ratelimit-remaining'] !== '0') {
		throw error;
	}

	let rateLimitResetMessage = headers['x-ratelimit-reset'] || '';
	if (rateLimitResetMessage) {
		let resetTime = new Date(Number.parseInt(rateLimitResetMessage, 10));
		resetTime = `${resetTime.getHours() + 1}:${resetTime.getMinutes().toString().padStart(2, '0')}`;
		rateLimitResetMessage = ` Rate limit resets at ${resetTime}`;
	}

	throw new GError(`Rate limited.${rateLimitResetMessage}`, 'EGS_RATE_LIMITED');
};
