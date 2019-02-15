const slugify = require('slugify');
const ExstaticError = require('../error');

module.exports = function navigation({fn}) {
	const navigation = this.instance.hbs.data('site.navigation');
	if (!Array.isArray(navigation)) {
		throw new ExstaticError('Navigation helper was called, but navigation does not exist');
	}

	let output = '';

	navigation.forEach(({title, href}) => {
		// @todo: determine how sub-pages should be handled
		// For example: If /blog/hello-world is being compiled, should it be possible to allow
		// `/blog` to be considered active? If so, what's the best way to implement it?
		const current = href.replace(/^\/|\/$/, '') === this.page.path.replace(/^\/|\/$/, '');
		const slug = slugify(title.toLowerCase());
		output += fn({title, href, current, slug});
	});

	return new this.instance.hbs.SafeString(output);
};
