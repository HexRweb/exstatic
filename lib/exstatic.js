const Promise = require('bluebird');
const {emptyDirSync: empty} = require('fs-extra');
const HookManager = require('@hexr/hookit');
const HandlebarsCompiler = require('./handlebars');
const FileManager = require('./file-manager');
const File = require('./file');
const ensureArray = require('./utils/ensure-array');
const readConfig = require('./utils/read-config');
const log = require('./log');
const t = require('./translations');
const registerHooks = require('./hooks');

const defaultConfig = {
	url: 'http://localhost',
	plugins: ['../plugins/minify-html.js']
};

class Exstatic {
	constructor(options = {}) {
		const {cache} = options;
		this.files = new FileManager(options);
		this.hook = new HookManager();
		// HandlebarsCompiler must be initialized after FileManager
		this._hbs = new HandlebarsCompiler(this, {cache});
		this.docs = false;
		this.data = {};
		registerHooks(this.hook);
		this.registerExitHooks();
	}

	async loadFileTypes() {
		log.verbose(t('Exstatic.registering_types'));
		const resolverArgs = [{name: 'page'}];
		this.types = await this.hook.executeHook('register_types', resolverArgs);
	}

	async initialize(overrides = {}) {
		let config = await readConfig(this.files.dir);
		config = Object.assign({}, defaultConfig, config, overrides);
		this.files.init(config);
		this._hbs.update();

		const {plugins} = config;
		delete config.plugins;

		ensureArray(plugins).forEach(pluginName => {
			pluginName = pluginName.replace('{cwd}', this.files.dir);
			let plugin;
			try {
				plugin = require(pluginName);
				plugin.registerHooks(this.hook.generateHookRegisterer(pluginName));
				log.verbose(t('Exstatic.plugin_loaded', {name: pluginName}));
			} catch (error) {
				log.error(t('Exstatic.plugin_loading_failed', {name: pluginName, error}));
			}
		});

		await Promise.all([this._hbs.init(), this.loadFileTypes()]);
		this.data.site = config;
		this._hbs.updateTemplateOptions({data: this.config});
		return this;
	}

	loadFile(file) {
		const theFile = new File({
			location: file,
			directory: this.files.inputDir,
			writePath: this.files.outputDir,
			url: this.data.site.url,
			tempFolder: this.files.tempDir,
			compiler: this._hbs.generateCompiler.bind(this._hbs)
		});

		return theFile.extractMeta();
	}

	async loadFiles() {
		if (this.docs) {
			return this.docs;
		}

		const blacklist = [this.files.layoutsDir, this.files.partialsDir].map(bad => bad.replace(/\\/g, '/'));

		log.info(t('Exstatic.reading_files'));
		const generateFileList = require('./utils/get-all-files');

		const docs = await Promise.resolve(generateFileList(this.files.inputDir, blacklist))
			.map(file => this.loadFile(file))
			.then(core => ({core, files: []}));
		this.docs = await this.hook.executeHook('post-document_generation', [docs]);
		log.info(t('Exstatic.files_read'));
		return this.docs;
	}

	// @todo: add support for relative files
	async refreshFile(filePath) {
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

		// @todo: reject if filePath will not be in `this.files.dir`
		this.docs.core.push(await this.loadFile(filePath));
	}

	refreshAll() {
		return Promise.each(this.docs.core || [], file => this.refreshFile(file.path));
	}

	write(force = false) {
		const writtenList = [];
		return Promise.mapSeries([this.docs.core, this.docs.files], async fileList => {
			fileList = await Promise.mapSeries(fileList, file => {
				log.verbose(t('Exstatic.compile_file', {name: file.filename}));
				const originalName = file.filename;
				let index = 0;
				while (writtenList.includes(file.filename)) {
					log.info(t('Exstatic.duplicate_detected', {path: file.filename}));
					file.filename = `${originalName}-${++index}`;
				}

				return file.compileFile();
			});

			fileList = await this.hook.executeHook('pre-write', [], fileList);
			await Promise.mapSeries(fileList, file => {
				log.verbose(t('Exstatic.write_file', {name: file.filename}));
				return file.write(force);
			});
		});
	}

	async run() {
		await this.initialize();
		await this.loadFiles();
		await this.write();
		this.onBeforeExit(true);
	}

	registerExitHooks() {
		const {tempDir} = this.files;
		/* eslint-disable unicorn/no-process-exit */
		this.onBeforeExit = (gracefully = false) => {
			const message = gracefully ? 'Exstatic.exiting' : 'Exstatic.terminating';
			log.info(t(message));
			empty(tempDir);
			log.info('Goodbye');
			process.exit();
		};
		/* eslint-enable unicorn/no-process-exit */

		process.on('SIGINT', this.onBeforeExit).on('SIGTERM', this.onBeforeExit);
	}
}

module.exports = opts => new Exstatic(opts);
module.exports.Exstatic = Exstatic;
