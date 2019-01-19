// const downsize = require('downsize');
module.exports = function generateExcerpt(text, options) {
	const settings = Object.assign({
		wordcount: 100,
		default: ''
	}, options.hash);

	// Strip html
	// @todo: get rid of or statement
	return (text || settings.default || '')
		.replace(/<\/?[^>]+>/gi, '')
		.replace(/(\r\n|\n|\r)+/gm, ' ')
		.trim();

	/* return downsize({
		words: settings.wordcount
	}); */

	// return new SafeString(excerpt);
};
