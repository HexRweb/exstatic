'use strict';
const path = require('path');
const Promise = require('bluebird');
const {readFileSync, emptyDirSync: empty, ensureDirSync: ensureDir} = require('fs-extra');
const File = require('./file');
const ensureArray = require('./utils/ensure-array');
const log = require('./log');
const t = require('./translations');
const hookResolver = require('./hook-resolver');

class Exstatic {
	constructor(options = {}) {
		const opts = Object.assign({
			inputDir: 'src/',
			outputDir: 'dist/',
			layoutsDir: '{input}/views',
			partialsDir: '{input}/views/partials'
		}, options);

		opts.layoutsDir = opts.layoutsDir.replace('{input}', opts.inputDir);
		opts.partialsDir = opts.partialsDir.replace('{input}', opts.inputDir);

		this.initializeProperties(opts);
		ensureDir(this.tempDir);

		this.registerExitHooks();
	}

	initializeProperties(opts) {
		const HookManager = require('./hook');
		// Cache the working directory in case it's changed later
		this.dir = process.cwd();
		this.inputDir = path.resolve(this.dir, opts.inputDir);
		this.outputDir = path.resolve(this.dir, opts.outputDir);
		this.layoutsDir = path.resolve(this.dir, opts.layoutsDir);
		this.partialsDir = path.resolve(this.dir, opts.partialsDir);
		this.tempDir = path.resolve(this.dir, '.exstatic');
		this.hook = new HookManager();
		this.docs = false;
		this.data = {};
		this.compileOptions = {
			strict: true,
			settings: {
				cache: opts.cache || (process.env.NODE_ENV === 'production'),
				layoutsDir: this.layoutsDir,
				partialsDir: this.partialsDir
			}
		};
		this._hbs = require('express-hbs').create();
		this._hbs.handlebars.logger.level = 0;
		this.compiler = Promise.promisify(this._hbs.express4(this.compileOptions.settings));
	}

	loadHelpers() {
		log.verbose(t('Exstatic.registering_helpers'));
		return this.hook.executeHook('pre-register_helpers').then(hookResults => {
			const internalHelpers = require('./helpers');
			return hookResolver('pre-register_helpers', internalHelpers, hookResults);
		}).then(helpers => {
			['sync', 'async'].forEach(helperType => {
				const suffix = helperType.indexOf('a') === 0 ? 'Async' : '';
				Object.getOwnPropertyNames(helpers[helperType]).forEach(helper => {
					log.debug(t('Exstatic.registering_helper', {
						async: suffix,
						name: helper
					}));
					this[`register${suffix}Helper`](helper, helpers[helperType][helper]);
				});
			});

			log.verbose(t('Exstatic.helpers_registered'));
		});
	}

	addHelper(name, fn) {
		const self = this;
		const proxyFn = function (...args) {
			this.instance = self;

			return fn.call(this, ...args);
		};

		return this._hbs.registerHelper(name, proxyFn);
	}

	addAsyncHelper(name, fn) {
		const self = this;
		const proxyFn = function (...args) {
			this.instance = self;

			return fn.call(...args);
		};

		return this._hbs.registerAsyncHelper(name, proxyFn);
	}

	initialize(overrides = {}) {
		let data = false;
		['json', 'yml', 'yaml'].forEach(ext => {
			if (data) {
				return;
			}

			const configFile = `./_config.${ext}`;
			try {
				if (ext === 'json') {
					data = require(path.resolve(this.dir, configFile));
				} else {
					const yaml = require('js-yaml');
					data = yaml.safeLoad(readFileSync(configFile));
				}
				log.info(t('Exstatic.using_config', {ext}));
			} catch (e) {}
		});

		this.data.site = Object.assign({url: 'http://localhost'}, data, overrides);
		ensureArray(this.data.site.plugins).forEach(pluginName => {
			pluginName = pluginName.replace('{cwd}', this.dir);
			let plugin;
			try {
				plugin = require(pluginName);
				plugin.registerHooks(this.hook.generateHookRegisterer(pluginName));
				log.verbose(t('Exstatic.plugin_loaded', {name: pluginName}));
			} catch (error) {
				log.error(t('Exstatic.plugin_loading_failed', {name: pluginName, error}));
			}
		});

		delete this.data.site.plugins;
		this._hbs.updateTemplateOptions({data: this.data});
		hookResolver.init(this);
		return this.loadHelpers();
	}

	loadFile(file) {
		const theFile = new File({
			location: file,
			directory: this.inputDir,
			url: this.data.site.url,
			tempFolder: this.tempDir,
			compiler: this.compileProxy.bind(this)
		});

		return theFile.extractMeta();
	}

	loadFiles() {
		if (this.docs) {
			return Promise.resolve(this.docs);
		}

		const blacklist = [
			// Files starting with `_` or (parent) directories starting with `_`
			{invert: false, expression: /[/\\]_/},
			// Non (hbs|html|md) files
			{invert: true, expression: /\.(?:hbs|html|md)$/}
		];

		log.info(t('Exstatic.reading_files'));
		const generateFileList = require('./utils/get-all-files');

		return generateFileList(this.inputDir, blacklist)
			.map(file => this.loadFile(file))
			.reduce((reduction, file) => {
				reduction.core.push(file);
				return reduction;
			}, {core: [], files: []}).then(docList => {
				this.docs = Object.assign({}, docList);
				return this.hook.executeHook('post-document_generation', docList);
			}).then(files => hookResolver('post-document_generation', this.docs, files)).then(docs => {
				this.docs = docs;
				log.info(t('Exstatic.files_read'));
				return this.docs;
			});
	}

	// @todo: add support for relative files
	refreshFile(filePath) {
		log.info(t('Exstatic.refreshing_file', {file: filePath}));
		let promise = false;

		[...this.docs.core, ...this.docs.files].forEach(file => {
			if (file.path === filePath) {
				promise = file.reload('extractMeta');
			}
		});

		if (promise) {
			return promise;
		}

		// @todo: reject if filePath will not be in `this.dir`
		return this.loadFile(filePath).then(newFile => {
			this.docs.core.push(newFile);
		});
	}

	refreshAll() {
		return Promise.each(this.docs.core || [], file => this.refreshFile(file.path));
	}

	write(force = false) {
		const writtenList = [];
		return Promise.mapSeries([this.docs.core, this.docs.files], fileList =>
			Promise.mapSeries(fileList, file => {
				log.verbose(t('Exstatic.compile_file', {name: file.filename}));
				const originalName = file.filename;
				let index = 0;
				while (writtenList.includes(file.filename)) {
					log.info(t('Exstatic.duplicate_detected', {path: file.filename}));
					file.filename = `${originalName}-${++index}`;
				}
				return file.compileFile();
			}).then(fileList => this.hook.executeHook('pre-write', fileList)).then(hookResult =>
				hookResolver('pre-write', hookResult)
			).mapSeries(file => {
				log.verbose(t('Exstatic.write_file', {name: file.filename}));
				return file.write(this.outputDir, force);
			})
		);
	}

	compileProxy(path, pageContext) {
		const context = Object.assign({}, this.compileOptions, pageContext);
		return this.compiler(path, context);
	}

	run() {
		return this.initialize().then(() => this.loadFiles()).then(() => this.write()).then(() => {
			this.onBeforeExit(true);
		});
	}

	registerExitHooks() {
		/* eslint-disable unicorn/no-process-exit, no-extra-bind */
		this.onBeforeExit = ((gracefully = false) => {
			const message = gracefully ? 'Exstatic.exiting' : 'Exstatic.terminating';
			log.info(t(message));
			empty(this.tempDir);
			log.info('Goodbye');
			process.exit();
		}).bind(this);
		/* eslint-enable unicorn/no-process-exit, no-extra-bind */

		process.on('SIGINT', this.onBeforeExit).on('SIGTERM', this.onBeforeExit);
	}
}

Exstatic.prototype.registerHelper = Exstatic.prototype.addHelper;
Exstatic.prototype.registerAsyncHelper = Exstatic.prototype.addAsyncHelper;

module.exports = opts => new Exstatic(opts);
