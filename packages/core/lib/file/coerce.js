const RealFile = require('./file');

module.exports = function coerceToFile(originalData, instance) {
	if (originalData.path && originalData.data) {
		const file = new RealFile({
			source: originalData.path.replace(/\.md$/, '.hbs'),
			fileManager: instance.fm,
			compiler: instance.hbs.generateCompiler.bind(instance.hbs)
		});

		file.raw = originalData.data.toString();
		return file;
	}

	throw new Error('COERSION_NOT_IMPLEMENTED');
};
