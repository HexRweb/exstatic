'use strict';
const path = require('path');
const Promise = require('bluebird');
const {readFileSync, emptyDirSync: empty, ensureDirSync: ensureDir} = require('fs-extra');
const HandlebarsCompiler = require('./handlebars');
const FileManager = require('./file-manager');
const File = require('./file');
const ensureArray = require('./utils/ensure-array');
const log = require('./log');
const t = require('./translations');
const HookManager = require('@hexr/hookit');
const registerHooks = require('./hooks');

class Exstatic {
	constructor(options = {}) {
		this.files = new FileManager(options);
		this.hook = new HookManager();
		// HandlebarsCompiler must be initialized after FileManager
		this._hbs = new HandlebarsCompiler(this, options.cache);
		this.docs = false;
		this.data = {};
		registerHooks(this.hook);
		this.registerExitHooks();
	}

	loadFileTypes() {
		log.verbose(t('Exstatic.registering_types'));
		const resolverArgs = [{name: 'page'}];
		return this.hook.executeHook('register_types', resolverArgs).then(types => {
			this.types = types;
		});
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
			} catch (_) {}
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
		return Promise.all(this._hbs.init(), this.loadFileTypes());
	}

	loadFile(file) {
		const theFile = new File({
			location: file,
			directory: this.files.inputDir,
			url: this.data.site.url,
			tempFolder: this.files.tempDir,
			compiler: this._hbs.generateCompiler.bind(this._hbs)
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

		return generateFileList(this.files.inputDir, blacklist)
			.map(file => this.loadFile(file))
			.then(core => ({core, files: []}))
			.then(docs => this.hook.executeHook('post-document_generation', [docs])).then(docs => {
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
			}).then(fileList => this.hook.executeHook('pre-write', [], fileList)).mapSeries(file => {
				log.verbose(t('Exstatic.write_file', {name: file.filename}));
				return file.write(this.files.outputDir, force);
			})
		);
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

module.exports = opts => new Exstatic(opts);
