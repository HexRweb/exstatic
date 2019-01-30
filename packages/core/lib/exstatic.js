const Promise = require('bluebird');
const {emptyDirSync: empty} = require('fs-extra');
const HookManager = require('@hexr/hookit');
const HandlebarsCompiler = require('./handlebars');
const FileManager = require('./file-manager');
const {ensureArray, readConfig, getAllFiles} = require('./utils');
const log = require('./log');
const t = require('./translations');
const registerHooks = require('./hooks');

const defaultConfig = {
	site: {
		url: 'http://localhost'
	},
	plugins: ['../plugins/minify-html.js']
};

class Exstatic {
	constructor(options = {}) {
		const {cache} = options;
		this.fm = new FileManager(options);
		this.hook = new HookManager();
		// HandlebarsCompiler must be initialized after FileManager
		this.hbs = new HandlebarsCompiler(this, {cache});
		registerHooks(this.hook);
		this.registerExitHooks();
	}

	async initialize(overrides = {}) {
		let {file, data: config} = await readConfig(this.fm.dir);
		config = Object.assign({}, defaultConfig, config, overrides);
		this.fm.init(config);
		this.fm.config = file;
		this.hbs.update();

		this.hbs.data('site', config.site);

		ensureArray(config.plugins).forEach(pluginName => {
			pluginName = pluginName.replace('{cwd}', this.fm.dir);
			let plugin;
			try {
				plugin = require(pluginName);
				plugin.registerHooks(this.hook.generateHookRegisterer(pluginName));
				log.verbose(t('Exstatic.plugin_loaded', {name: pluginName}));
			} catch (error) {
				log.error(t('Exstatic.plugin_loading_failed', {name: pluginName, error}));
			}
		});

		await this.hbs.init();
		return this;
	}

	get url() {
		return this.hbs.data('site.url');
	}

	async loadFiles() {
		if (this.fm.files) {
			return;
		}

		const blacklist = [this.fm.layoutsDir, this.fm.partialsDir];

		log.info(t('Exstatic.reading_files'));
		this.fm.files = await Promise.resolve(getAllFiles(this.fm.inputDir, blacklist))
			.map(file => this.fm.addFile(file, true));
		await this.hook.executeHook('load-pages', this.fm.files);
		log.info(t('Exstatic.files_read'));
	}

	async compile() {
		/*
		* Compilation needs to be done in series because we're using a shared compiler -
		* due to the current functionality of block helpers, if compilation was done async,
		* all of the calls to the `contentFor` block helper in every file would add up and
		* only be written to the first file that calls the corresponding `block` helper
		*/
		return Promise.mapSeries(this.fm.files, file => {
			log.verbose(t('Exstatic.compile_file', {name: file.source}));
			return file.compile();
		});
	}

	async write(force = false) {
		const usedFilenames = [];
		await this.compile();

		this.fm.files.forEach(file => {
			const originalName = file.filename;
			let index = 0;

			while (usedFilenames.includes(file.filename)) {
				log.info(t('Exstatic.duplicate_detected', {path: file.filename}));
				file.filename = `${originalName}-${++index}`;
			}

			usedFilenames.push(file.filename);
		});

		// Protect race conditions in hook
		const {files} = this.fm;

		this.fm.files = await this.hook.executeHook('pre-write', [], files);
		await Promise.map(this.fm.files, file => {
			log.verbose(t('Exstatic.write_file', {name: file.filename}));
			return file.save(force);
		});
	}

	async run() {
		await this.initialize();
		await this.loadFiles();
		await this.write();
		this.onBeforeExit(true);
	}

	registerExitHooks() {
		const {tempDir} = this.fm;
		/* eslint-disable unicorn/no-process-exit */
		this.onBeforeExit = (gracefully = false) => {
			const message = gracefully ? 'Exstatic.exiting' : 'Exstatic.terminating';
			log.info(t(message));
			empty(tempDir);
			process.exit();
		};
		/* eslint-enable unicorn/no-process-exit */

		process.on('SIGINT', this.onBeforeExit).on('SIGTERM', this.onBeforeExit);
	}
}

module.exports = opts => new Exstatic(opts);
module.exports.Exstatic = Exstatic;
