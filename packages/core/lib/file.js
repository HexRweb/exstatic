const assert = require('assert');
const path = require('path');
const {readFile, writeFile, ensureDir} = require('fs-extra');
const marked = require('marked');
const {stripYaml, getYaml} = require('./utils/yaml-parser');
const normalize = require('./utils/normalize');
const fileUtils = require('./utils/file');
const t = require('./translations');

/*
 * Pattern used by express-hbs to get layout
 * @link https://github.com/barc/express-hbs/blob/master/lib/hbs.js
*/
const expHbsLayoutPattern = /{{!<\s+([A-Za-z0-9\._\-\/]+)\s*}}/;

class File {
	constructor(options = {}) {
		['location', 'directory', 'url', 'compiler', 'tempFolder', 'writePath'].forEach(requiredOpt => {
			assert.ok(options[requiredOpt], `Option "${requiredOpt}" is missing`);
		});

		this.dir = normalize(options.directory);
		this.source = normalize(path.resolve(this.dir, options.location));
		this.writePath = normalize(options.writePath);
		this.baseUrl = options.url;
		this.compiler = options.compiler;
		this.tempDir = normalize(path.resolve(this.dir, options.tempFolder));
		this.meta = false;
		this.rendered = false;
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

		// Step 2: Extract metadata from file
		try {
			this.meta = getYaml(contents);
			contents = stripYaml(contents);
		} catch(error) {
			throw new Error(t('File.yaml_failed', {path: this.source, error}));
		}

		// Step 3: Handle metadata
		// 3a. Determine what layout to use
		let layout = this.meta.layout;

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
		const urlPath = fileUtils.urlPath(this.meta.path, this.dir, this.source);
		this.meta.title = fileUtils.title(this.meta.title, urlPath);
		const filePath = fileUtils.fileName(urlPath);
		this.filename = normalize(path.resolve(this.writePath, filePath));

		const tempPath = path.resolve(
			this.tempDir,
			filePath.replace('.html', '.hbs').replace(/\//g, '-')
		);

		// Step 4: Compile
		await writeFile(tempPath, contents);
		contents = await this.compiler(tempPath, {page: this.meta});

		// Build markdown
		contents = marked(contents, {
			mangle: false,
			baseUrl: this.baseUrl
		});

		// Add layout definition and compile hbs

		contents = `{{!< ${layout}}}\n${contents}`;

		await writeFile(tempPath, this.compiledSection);
		this.compiled = await this.compiler(tempPath, {page: this.meta});
		return this;
	}

	async save(reWrite = false) {
		if (this.written && !reWrite) {
			return this;
		}

		const saveLocation = path.resolve(this.writePath, this.filename);

		await ensureDir(path.dirname(saveLocation));
		await writeFile(saveLocation, this.rendered);
		this.written = true;
		return this;
	}

	// @todo: use fs.stat to reload only if the file changed since last read
	async reload() {
		this.meta = {};
		this.raw = false;
		this.rendered = false;
		this.written = false;

		await this.read();
		return this;
	}
}

module.exports = File;
