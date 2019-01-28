const {ensureArray} = require('../utils');

module.exports = function postDocumentGenerationHookResolver(hookResults, docs) {
	hookResults.forEach(newPages => {
		ensureArray(newPages).forEach(docAddition => {
			docs.files.push(docAddition);
		});

	});

	return docs;
};
