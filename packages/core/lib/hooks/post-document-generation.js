const ensureArray = require('../utils/ensure-array');

module.exports = function postDocumentGenerationHookResolver(hookResults, docs) {
	/*
	** Note: We intentionally don't allow hook methods to modify the docs object
	** to maintain a level of sanity. If you have a use-case for modifying it,
	** please let us know!
	**
	** The hook function should return a file or an array of files to be added
	** to the document list
	*/

	// @todo: write collision detection
	hookResults.forEach(docAdditions => {
		ensureArray(docAdditions).forEach(docAddition => {
			docs.files.push(docAddition);
		});
	});

	return docs;
};
