const assert = require('assert');
const path = require('path');
const {readFile} = require('@exstatic/utils').fs;
const marked = require('marked');
const {normalize, file: fileUtils, yamlParser} = require('../utils');
const t = require('../translations');
const AbstractFile = require('./abstract-file');

const {stripYaml, getYaml} = yamlParser;
/*
 * Pattern used by express-hbs to get layout
 * @link https://github.com/barc/express-hbs/blob/master/lib/hbs.js
*/
const expHbsLayoutPattern = /{{!<\s+([\w.\-/]+)\s*}}/;

class File extends AbstractFile {
	constructor(options = {}) {
		super(options);

		this.writeProperty = 'compiled';

		assert.ok(options.compiler);

		this.source = normalize(path.resolve(this.input, this.source));
		this.compiler = options.compiler;
		this.meta = false;
	}

	async read() {
		if (this.raw) {
			return this;
		}

		this.raw = await readFile(this.source);
		return this;
	}

	async compile() {
		// Step 1: Read contents
		await this.read();
		let contents = this.raw.toString().trim();

		if (!contents) {
			this.compiled = '';
			return this;
		}

		// Step 2: Extract metadata from file
		try {
			this.meta = getYaml(contents);
			contents = stripYaml(contents);
		} catch (error) {
			throw new Error(t('File.yaml_failed', {path: this.source, error}));
		}

		// Step 3: Handle metadata
		// 3a. Determine what layout to use
		let {layout} = this.meta;

		// CASE: Layout was defined in meta
		if (!layout) {
			layout = contents.match(expHbsLayoutPattern);
			// CASE: layout was defined (`{{!> layout}})`)
			if (layout) {
				layout = layout[1];
				// CASE: no layout specified
			} else {
				layout = 'default';
			}
		}

		// No matter what, the layout definition needs to be removed
		contents = contents.replace(expHbsLayoutPattern, '');

		this.meta.layout = layout;

		// 3b. Determine paths
		const urlPath = fileUtils.urlPath(this.meta.path, this.input, this.source);
		this.meta.title = fileUtils.title(this.meta.title, urlPath);
		const filePath = fileUtils.fileName(urlPath, Boolean(this.meta.path));
		this.filename = normalize(path.resolve(this.output, filePath));
		this.meta.path = filePath.replace('/index.html', '/');

		this.tempContext = this.tempContext || filePath.replace('.html', '.hbs').replace(/\//g, '-');
		const temporaryFile = this.temp.acquire(this.tempContext);

		// Step 4: Compile
		await temporaryFile.write(contents);
		contents = await this.compiler(temporaryFile.path, {page: this.meta});

		// Build markdown
		contents = marked(contents, {
			mangle: false,
			baseUrl: this.parent.url
		});

		// Add layout definition and compile hbs

		contents = `{{!< ${layout}}}\n${contents}`;

		await temporaryFile.write(contents);
		this.compiled = Buffer.from(await this.compiler(temporaryFile.path, {page: this.meta}));
		return this;
	}

	// @todo: use fs.stat to reload only if the file changed since last read
	async reload() {
		this.meta = {};
		this.raw = false;

		await AbstractFile.prototype.reload.call(this);
		return this;
	}
}

module.exports = File;
