'use strict';
const path = require('path');
const Promise = require('bluebird');
const {readFile, writeFile, ensureDir} = require('fs-extra');
const marked = require('marked');
const {stripYaml, getYaml} = require('./utils/yaml-parser');

/*
** This is the File Class. It's responsible for storing and parsing metadata for
** a given page (here, a page is _any_ resource, not just a static object). The
** methods are written in the order they _should_ be called. Every method has a
** dependency of all of the previous methods being called. However, if it's
** closest previous method wasn't called, it will call it, which means you can
** call a method and not have to worry about dependencies. There are 2
** exceptions - the constructor (for obvious reasons), and the write method,
** which depends on the compile method, which needs to be passed the compiler to
** use.
**
** All methods return the instance
**
** Lifecycle: Construct ➡ Read ➡ Get YAML ➡ Compile markdown ➡ Compile HBS ➡
**			➡ save in proper location
**
** The reason we don't export this as 1 function is 2-fold - first, it's much
** easier to read and understand now, but more importantly, we can stop at any
** state, which opens possibilities to extend the functionality of exstatic
*/

class File {
	constructor(location, permalink) {
		this.dir = process.cwd();
		this.path = path.resolve(this.dir, location);
		this.permalink = permalink.replace(/^\//, '');
		this.name = path.basename(this.path).replace(/\.[^.]{0,}$/, '').replace(/\s/g, '-');
		this.raw = false;
		this.pagePath = false;
		this.md = false;
		this.meta = false;
		this.hbs = false;
		this.rendered = false;
	}

	read() {
		if (this.raw) {
			return Promise.resolve(this);
		}

		return readFile(this.path, 'utf8').then(file => {
			this.raw = file.trim();
			return this;
		});
	}

	// YAML is used for metadata; this is the `Get YAML` step of the lifecycle
	extractMeta() {
		if (this.md && (typeof this.meta === 'object')) {
			return Promise.resolve(this);
		}

		return this.read().then(() => {
			this.meta = getYaml(this.raw);
			this.md = stripYaml(this.raw);

			if (this.meta.path) {
				this.pagePath = this.meta.path;
				this.meta.path = undefined;
			} else {
				this.pagePath = this.permalink.replace(/{slug}/g, this.name);
			}

			return this;
		});
	}

	buildMarkdown() {
		if (this.hbs) {
			return Promise.resolve(this);
		}

		return this.extractMeta().then(() => {
			this.hbs = marked(this.md, {
				mangle: false
			});

			/*
			** @todo: We need to make sure the markdown doesn't already contain
			**		an express-hbs layout definition (`{{!< layout}}`) - if it
			**		does, we need to give the metadata preference and get rid
			**		of the markdown's version
			*/

			/*
			** @todo: Extract express-hbs layout definition if it exists - marked
			**
			*/
			if (this.meta.layout) {
				this.hbs = `{{!< ${this.meta.layout}}}\n${this.hbs}`;
				delete this.meta.layout;
			}

			return this;
		});
	}

	compile(_compile, tempDir) {
		if (this.rendered) {
			return Promise.resolve(this);
		}

		const tempFile = path.resolve(tempDir, `${this.name}.hbs`);

		return this.buildMarkdown()
			// The temp folder is cleaned up before the process exits so we don't need to cleanup
			.then(() => writeFile(tempFile, this.hbs))
			.then(() => _compile(tempFile, this.meta))
			.then(compiled => {
				this.rendered = compiled;
				return this;
			});
	}

	write(location) {
		if (!this.rendered) {
			return Promise.reject(new Error('NOT_COMPILED'));
		}

		if (this.wroteTo) {
			return Promise.resolve(this);
		}

		const saveLocation = path.resolve(location, `${this.pagePath}.html`);
		console.log(`saving to ${saveLocation}`);

		return ensureDir(path.dirname(saveLocation)).then(() =>
			writeFile(saveLocation, this.rendered)
		).then(() => {
			this.wroteTo = saveLocation;
			return this;
		});
	}
}

module.exports = File;
