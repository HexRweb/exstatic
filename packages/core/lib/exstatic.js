const Promise = require('bluebird');
const {log} = require('@exstatic/logging');
const HookManager = require('@hexr/hookit');
const HandlebarsCompiler = require('./handlebars');
const FileManager = require('./file-manager');
const {ensureArray, readConfig, getAllFiles, registerFileHooks} = require('./utils');
const t = require('./translations');
const registerHooks = require('./hooks');
const ExstaticError = require('./error');

const defaultConfig = {
	site: {
		url: 'http://localhost'
	},
	plugins: ['../plugins/minify-html.js', '../plugins/sitemap.js']
};

class Exstatic {
	constructor(options = {}) {
		const {cache} = options;
		this.fm = new FileManager(options, this);
		this.hook = new HookManager();
		// HandlebarsCompiler must be initialized after FileManager
		this.hbs = new HandlebarsCompiler(this, {cache});
		registerHooks(this.hook);
		this.registerExitHooks();
	}

	async initialize(overrides = {}) {
		let {file, data: config} = await readConfig(this.fm.dir);
		config = Object.assign({}, defaultConfig, config, overrides);
		this.__config = config;
		this.fm.initSyncOnly(config);
		this.fm.config = file;
		this.hbs.data('site', config.site);

		registerFileHooks(this.hook.generateHookRegisterer('project'), this);

		const namespaces = [];
		config.plugins = ensureArray(config.plugins);
		for (let path of config.plugins) {
			path = this.fm.resolve(path);
			try {
				const plugin = require(path);

				if (plugin.name && config[plugin.name] && typeof plugin.configure === 'function') {
					if (namespaces.includes(plugin.name)) {
						throw new ExstaticError(t('Exstatic.namespaceCollision', {
							namespace: plugin.name,
							path
						}));
					}

					plugin.configure(config[plugin.name]);
				}

				plugin.registerHooks(this.hook.generateHookRegisterer(path));
				log.verbose(t('Exstatic.plugin_loaded', {name: path}));
			} catch (error) {
				if (error instanceof ExstaticError) {
					throw error;
				}

				log.error(t('Exstatic.plugin_loading_failed', {name: pluginName, error}));
			}
		}

		await Promise.all([this.hbs.init(), this.fm.init()]);
		await this.hook.executeHook('initialized', [], this);
		return this;
	}

	get url() {
		return this.hbs.data('site.url');
	}

	async loadFiles() {
		if (this.fm.files.length > 0) {
			return;
		}

		const blacklist = [this.fm.layoutsDir, this.fm.partialsDir];

		log.info(t('Exstatic.reading_files'));
		await Promise.resolve(getAllFiles(this.fm.inputDir, blacklist)).map(file => this.fm.addFile(file, true));
		await this.hook.executeHook('load-pages', [this.fm.files]);
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
		/* eslint-disable unicorn/no-process-exit */
		this.onBeforeExit = (gracefully = false) => {
			const message = gracefully ? 'Exstatic.exiting' : 'Exstatic.terminating';
			log.info(t(message));
			this.fm.shutdown();
			process.exit();
		};
		/* eslint-enable unicorn/no-process-exit */

		process.on('SIGINT', this.onBeforeExit).on('SIGTERM', this.onBeforeExit);
	}
}

module.exports = opts => new Exstatic(opts);
module.exports.Exstatic = Exstatic;
