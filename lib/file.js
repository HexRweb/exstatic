'use strict';
const path = require('path');
const Promise = require('bluebird');
const {readFile, writeFile, ensureDir} = require('fs-extra');
const marked = require('marked');
const slugify = require('slugify');
const {stripYaml, getYaml} = require('./utils/yaml-parser');
const t = require('./translations');

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
** Lifecycle: Construct ➡ Read ➡ Get YAML ➡ Compile markdown ➡ Compile HBS ➡ Save
**
** The reason we don't export this as 1 function is 2-fold - first, it's much
** easier to read and understand now, but more importantly, we can stop at any
** state, which opens possibilities to extend the functionality of exstatic
*/

class File {
	constructor(location, dir, baseUrl) {
		this.dir = dir;
		this.path = path.resolve(this.dir, location);
		this.baseUrl = baseUrl;
		this.raw = false;
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
				// @todo: make sure there isn't a zip-slip-like vuln here (that's why there's this
				// redundant assignment)
				this.meta.path = this.meta.path;
			} else {
				this.meta.path = path.relative(this.dir, this.path);
			}

			this.filename = File.generateFileName(this.meta.path);
			this.meta.path = `/${this.filename.replace('/index.html', '/').replace('index.html', '')}`;

			this.meta.title = this.meta.title || path.basename(this.meta.path);
			// The path and filename need to be saved as lowercase, but the title needs to match
			// the case that was provided
			this.meta.path = this.meta.path.toLowerCase();
			this.meta.slug = slugify(this.meta.path);
			this.filename = this.filename.toLowerCase();

			return this;
		}).catch(error => {
			return Promise.reject(new Error(t('File.yaml_failed', {path: this.path, error})));
		});
	}

	buildMarkdown() {
		if (this.hbs) {
			return Promise.resolve(this);
		}

		return this.extractMeta().then(() => {
			this.hbs = marked(this.md, {
				mangle: false,
				baseUrl: this.baseUrl
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
			} else {
				this.hbs = `{{!< default}}\n${this.hbs}`;
			}

			return this;
		});
	}

	compile(_compile, tempDir) {
		if (this.rendered) {
			return Promise.resolve(this);
		}

		const tempFile = path.resolve(tempDir, `${this.meta.title}.hbs`);

		return this.buildMarkdown()
			// The temp folder is cleaned up before the process exits so we don't need to delete anything
			.then(() => writeFile(tempFile, this.hbs))
			.then(() => _compile(tempFile, {page: this.meta}))
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

		const saveLocation = path.resolve(location, this.filename);

		return ensureDir(path.dirname(saveLocation)).then(() =>
			writeFile(saveLocation, this.rendered)
		).then(() => {
			this.wroteTo = saveLocation;
			return this;
		});
	}

	static generateFileName(pagePath) {
		// Make url-friendly
		pagePath = slugify(pagePath, {
			// See https://github.com/simov/slugify/issues/13
			remove: /[^\w\s$*_+~.()'"!\-:@/\\]/g
		});
		// Make sure the file extension is `.html`
		pagePath = `${pagePath.replace(/\.[^.]{0,}$/, '')}.html`;
		// Clear slashes
		pagePath = `${pagePath.replace(/^\/|\/$/, '')}`;

		// Give the path it's own directory
		if (!pagePath.match(/\/?index\.html$/i)) {
			pagePath = `${pagePath.replace(/\.html$/i, '')}/index.html`;
		}

		return pagePath;
	}

	reload(to) {
		if (!typeof this[to] === 'function') {
			return Promise.reject(new Error(`State ${to} is unknown`));
		}

		this.raw = false;
		this.md = false;
		this.meta = false;
		this.hbs = false;
		this.rendered = false;

		return this[to]();
	}
}

module.exports = File;
