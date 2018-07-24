module.exports = function defaultHelper(value, fallback) {
	return (value === undefined || value === false) ? fallback : value;
};
