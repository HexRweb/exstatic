const {inspect} = require('util');

module.exports = class ExstaticError extends Error {
	static coerce(error, code) {
		const _error = new this(error.message, code);
		_error.originalError = error;
		return _error;
	}

	constructor(message, code) {
		super(message);

		if (code) {
			this.code = code;
		}
	}

	toString() {
		if (this.originalError) {
			return inspect(this.originalError);
		}

		return super.toString();
	}
};
