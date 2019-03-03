module.exports = {
	get cache() {
		return require('./cache');
	},
	get tmp() {
		return require('./tmp');
	}
};
