const {readFile, writeFile, unlink} = require('@exstatic/utils').fs;

module.exports = class FileContext {
	constructor(path) {
		this.file = path;
		this.data = '';
	}

	get path() {
		return this.file;
	}

	async getContents() {
		if (this.data) {
			return this.data;
		}

		this.data = await readFile(this.file);
		return this.data;
	}

	write(data = false) {
		if (data) {
			this.data = data;
		}

		if (!this.data) {
			return false;
		}

		return writeFile(this.file, this.data);
	}

	flush() {
		this.data = '';
	}

	destroy() {
		return unlink(this.file);
	}
};
