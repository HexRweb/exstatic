const assert = require('assert');
const path = require('path');
const {readFile, writeFile, ensureDir} = require('fs-extra');
const marked = require('marked');
const slugify = require('slugify');
const {stripYaml, getYaml} = require('./utils/yaml-parser');
const normalize = require('./utils/normalize');
const t = require('./translations');

/*
 * Pattern used by express-hbs to get layout
 * @link https://github.com/barc/express-hbs/blob/master/lib/hbs.js
*/
const expHbsLayoutPattern = /{{!<\s+[A-Za-z0-9._\-/]+\s*}}/;

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
		['location', 'directory', 'url', 'compiler', 'tempFolder', 'writePath'].forEach(requiredOpt => {
			assert.ok(options[requiredOpt], `Option "${requiredOpt}" is missing`);
		});

		this.dir = normalize(options.directory);
		this.path = normalize(path.resolve(this.dir, options.location));
		this.writePath = normalize(options.writePath);
		this.baseUrl = options.url;
		this.compiler = options.compiler;
		this.tempDir = normalize(path.resolve(this.dir, options.tempFolder));
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
			this.filename = normalize(this.filename.toLowerCase());
			this.tempName = `${this.filename.replace('/index.html', '').replace(/\//g, '-')}.hbs`;

			return this;
		} catch (error) {
			throw new Error(t('File.yaml_failed', {path: this.path, error}));
		}
	}

	async compileSection() {
		if (this.md) {
			return this;
		}

		await this.extractMeta();

		const tempFile = path.resolve(this.tempDir, this.tempName);
		// The temp folder is cleaned up before the process exits so we don't need to delete anything
		await ensureDir(path.dirname(tempFile));
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

		await this.buildMarkdown();

		const tempFile = path.resolve(this.tempDir, this.tempName);

		// CASE: Layout was explicitly specified
		// CASE: Layout definition was already defined
		if (this.meta.layout) {
			// Meta layout gets preference over markdown layout
			this.compiledSection = this.compiledSection.replace(expHbsLayoutPattern, '');
			this.compiledSection = `{{!< ${this.meta.layout}}}\n${this.compiledSection}`;
			delete this.meta.layout;
		} else if (!expHbsLayoutPattern.test(this.compiledSection)) {
			this.compiledSection = `{{!< default}}\n${this.compiledSection}`;
		}

		await writeFile(tempFile, this.compiledSection);
		this.rendered = await this.compiler(tempFile, {page: this.meta});
		return this;
	}

	async write(force = false) {
		if (this.wroteTo && !force) {
			return this;
		}

		await this.compileFile();

		const saveLocation = path.resolve(this.writePath, this.filename);

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
