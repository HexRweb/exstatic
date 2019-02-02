const slugify = require('slugify');

module.exports = function classes() {
	const {SafeString} = this.instance.hbs;
	let classes = [];

	if (this.page.layout) {
		classes.push(slugify(`layout-${this.page.layout}`));
	}

	let pageClass = this.page.path.replace(/^\/|\/$/, '');
	pageClass = `page-${pageClass.replace(/\//g, '-').toLowerCase()}`;
	classes.push(slugify(pageClass));

	return new SafeString(classes.join(' '));
};
