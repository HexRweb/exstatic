const slugify = require('slugify');

module.exports = function classes() {
	const {SafeString} = this.instance.hbs;
	const classes = [];

	if (this.page.layout) {
		classes.push(slugify(`layout-${this.page.layout}`));
	}

	let pageClass = this.page.path.replace(/^\/|\/$/, '').replace(/index\.html$/, 'index');

	pageClass = `page-${pageClass.replace(/\/|\./g, '-').toLowerCase()}`;
	classes.push(slugify(pageClass));

	return new SafeString(classes.join(' '));
};
