module.exports = {
	get log() {
		return require('./log.js');
	},

	get debug() {
		return require('./debug.js');
	}
};
