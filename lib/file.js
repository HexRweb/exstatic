'use strict';
const assert = require('assert');
const path = require('path');
const {readFile, writeFile, ensureDir} = require('fs-extra');
const marked = require('marked');
const slugify = require('slugify');
const {stripYaml, getYaml} = require('./utils/yaml-parser');
const t = require('./translations');

// @todo: Update documentation with new lifecycle
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
** Lifecycle: Construct ➡ Read ➡ Get YAML ➡ Compile HBS ➡ Compile Markdown ➡ Save
**
** The reason we don't export this as 1 function is 2-fold - first, it's much
** easier to read and understand now, but more importantly, we can stop at any
** state, which opens possibilities to extend the functionality of exstatic
*/

class File {
	constructor(options = {}) {
		['location', 'directory', 'url', 'compiler', 'tempFolder'].forEach(requiredOpt => {
			assert.ok(options[requiredOpt]);
		});

		this.dir = options.directory;
		this.path = path.resolve(this.dir, options.location);
		this.baseUrl = options.url;
		this.compiler = options.compiler;
		this.tempDir = path.isAbsolute(options.tempFolder) ?
			options.tempFolder : path.resolve(this.dir, options.tempFolder);
		this.raw = false;
		this.md = false;
		this.meta = false;
		this.hbs = false;
		this.rendered = false;
	}

	async read() {
		if (this.raw) {
			return this;
		}

		this.raw = (await readFile(this.path, 'utf8')).trim();
		return this;
	}

	// YAML is used for metadata; this is the `Get YAML` step of the lifecycle
	async extractMeta() {
		if (this.hbs && (typeof this.meta === 'object')) {
			return this;
		}

		try {
			await this.read();

			this.meta = getYaml(this.raw);
			this.hbs = stripYaml(this.raw);

			if (this.meta.path) {
				// @todo: make sure there isn't a zip-slip-like vuln here (that's why there's this
				// redundant assignment)
				this.meta.path = this.meta.path;
			} else {
				this.meta.path = path.relative(this.dir, this.path);
			}

			this.filename = File.generateFileName(this.meta.path);
			this.meta.path = `/${this.filename.replace('/index.html', '/').replace('index.html', '')}`;
			// @todo: determine behavior of path.basename for index files
			this.meta.title = this.meta.title || path.basename(this.meta.path);
			// The path and filename need to be saved as lowercase, but the title needs to match
			// the case that was provided
			this.meta.path = this.meta.path.toLowerCase();
			this.meta.slug = slugify(this.meta.path);
			this.filename = this.filename.toLowerCase();
			this.tempName = `${this.filename.replace(/\//g, '-').replace('index.html', '')}.hbs`;

			return this;
		} catch (error) {
			throw new Error(t('File.yaml_failed', {path: this.path, error}));
		}
	}

	async compileSection() {
		if (this.md) {
			return this;
		}

		const tempFile = path.resolve(this.tempDir, this.tempName);

		await this.extractMeta();
		// The temp folder is cleaned up before the process exits so we don't need to delete anything
		await writeFile(tempFile, this.hbs);
		this.md = await this.compiler(tempFile, {page: this.meta});
		return this;
	}

	async buildMarkdown() {
		if (this.compiledSection) {
			return this;
		}

		await this.compileSection();
		this.compiledSection = marked(this.md, {
			mangle: false,
			baseUrl: this.baseUrl
		});

		return this;
	}

	async compileFile() {
		if (this.rendered) {
			return this;
		}

		const tempFile = path.resolve(this.tempDir, this.tempName);

		await this.buildMarkdown();
		/*
		** @todo: We need to make sure the markdown doesn't already contain
		**		an express-hbs layout definition (`{{!< layout}}`) - if it
		**		does, we need to give the metadata preference and get rid
		**		of the markdown's version
		*/

		/*
		** @todo: Extract express-hbs layout definition if it exists - marked
		*/
		if (this.meta.layout) {
			this.compiledSection = `{{!< ${this.meta.layout}}}\n${this.compiledSection}`;
			delete this.meta.layout;
		} else {
			this.compiledSection = `{{!< default}}\n${this.compiledSection}`;
		}

		await writeFile(tempFile, this.compiledSection);
		this.rendered = await this.compiler(tempFile, {page: this.meta});
		return this;
	}

	async write(location, force = false) {
		if (this.wroteTo && !force) {
			return this;
		}

		const saveLocation = path.resolve(location, this.filename);

		await this.compileFile();
		await ensureDir(path.dirname(saveLocation));
		await writeFile(saveLocation, this.rendered);
		this.wroteTo = saveLocation;
		return this;
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

	// @todo: use fs.stat to reload only if the file changed since last read
	async reload(to) {
		if (!(typeof this[to] === 'function')) {
			// This isn't a type error :D
			throw new Error(`State ${to} is unknown`); /* eslint-disable-line unicorn/prefer-type-error */
		}

		this.raw = false;
		this.meta = false;
		this.hbs = false;
		this.md = false;
		this.compiledSection = false;
		this.rendered = false;
		this.wroteTo = false;

		await this[to]();
		return this;
	}
}

module.exports = File;
