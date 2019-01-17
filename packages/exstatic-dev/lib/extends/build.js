const {Exstatic} = require('@exstatic/core');

module.exports = async function watchForChanges() {
	if (!(this instanceof Exstatic)) {
		throw new TypeError('Incorrect usage of build - did not received Exstatic instance');
	}

	// @todo: add `initialized` property
	if (!this.types) {
		await this.initialize();
	}

	await this.loadFiles();
	await this.write();

	return this;
};
