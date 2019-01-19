module.exports = function baseHandler({d}) {
	if (d) {
		try {
			process.chdir(d);
		} catch (error) {
			const message = error.code === 'ENOENT' ? 'it does not exist' : error.message;
			throw new Error(`Unable to run in ${d} - ${message}`);
		}
	}

	// @todo: Add isExstaticInstance check
};
