const HOOK_NAME = 'register-helpers';
const noVal = Symbol('__hbs__no_val');

const {promisify} = require('util');
const hbs = require('express-hbs');
const get = require('lodash.get');
const set = require('lodash.set');
const {log} = require('@exstatic/logging');
const {ensureDir} = require('./utils').fs;
const t = require('./translations');

class HandlebarsCompiler {
	constructor(exstaticInstance, {cache = false}) {
		this.instance = exstaticInstance;
		this.compileOptions = {
			cache: cache || (process.env.NODE_ENV === 'production'),
			preventIndent: true,
			strict: true,
			settings: {
				layoutsDir: this.instance.fm.layoutsDir,
				partialsDir: this.instance.fm.partialsDir
			}
		};
		this._hbs = hbs.create();
		this._hbs.handlebars.logger.level = 0;
		this._data = {};
	}

	async init() {
		this.compileOptions.settings.layoutsDir = this.instance.fm.layoutsDir;
		this.compileOptions.settings.partialsDir = this.instance.fm.partialsDir;

		await Promise.all([ensureDir(this.instance.fm.layoutsDir), ensureDir(this.instance.fm.partialsDir)]);

		this.compiler = promisify(this._hbs.express4(this.compileOptions.settings));
		log.verbose(t('Exstatic.registering_helpers'));
		const resolverArgs = [require('./helpers')];
		const helpers = await this.instance.hook.executeHook(
			HOOK_NAME, resolverArgs
		);

		for (const type of ['sync', 'async']) {
			for (const helperName of Object.keys(helpers[type])) {
				log.debug(t('Exstatic.registering_helper', {
					type,
					name: helperName
				}));
				const helperFn = helpers[type][helperName];
				this.registerHelperType(type, helperName, helperFn);
			}
		}

		log.verbose(t('Exstatic.helpers_registered'));
		this.updateData();
	}

	registerHelperType(helperType, helperName, helperAction) {
		if (!['sync', 'async'].includes(helperType)) {
			throw new TypeError(`helperType must be "sync" or "async", received "${helperType}"`);
		}

		if (typeof helperName !== 'string') {
			throw new TypeError('helperName must be a string');
		}

		if (typeof helperAction !== 'function') {
			throw new TypeError('helperAction must be a function');
		}

		const self = this;
		function exstaticHelperProxy(...args) {
			let bound = this;
			if (typeof bound === 'string') {
				bound = {value: this};
			}

			bound.instance = self.instance;

			return helperAction.call(bound, ...args);
		}

		const hbsFn = helperType === 'sync' ? 'registerHelper' : 'registerAsyncHelper';
		return this._hbs[hbsFn](helperName, exstaticHelperProxy);
	}

	generateCompiler(path, pageContext) {
		const context = Object.assign({}, this.compileOptions, pageContext);
		return this.compiler(path, context);
	}

	registerHelper(...args) {
		return this.registerHelperType('sync', ...args);
	}

	registerAsyncHelper(...args) {
		return this.registerHelperType('async', ...args);
	}

	updateTemplateOptions(...args) {
		return this._hbs.updateTemplateOptions(...args);
	}

	updateData() {
		return this._hbs.updateTemplateOptions({data: this._data});
	}

	data(path = false, value = noVal) {
		if (!path) {
			return this._data;
		}

		if (value === noVal) {
			return get(this._data, path);
		}

		set(this._data, path, value);

		if (this.compiler) {
			this.updateData();
		}
	}

	get SafeString() {
		return this._hbs.handlebars.SafeString;
	}

	get escapeExpression() {
		return this._hbs.handlebars.Utils.escapeExpression;
	}
}

module.exports = HandlebarsCompiler;
