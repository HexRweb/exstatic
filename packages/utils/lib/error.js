module.exports = class ExstaticError extends Error {
	constructor(message, code) {
		super(message);

		if (code) {
			this.code = code;
		}
	}
};
