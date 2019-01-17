const HOOK_NAME = 'pre-register_helpers';

const Promise = require('bluebird');
const log = require('./log');
const t = require('./translations');

class HandlebarsCompiler {
	constructor(exstaticInstance, {cache = false}) {
		this.instance = exstaticInstance;
		this.compileOptions = {
			cache: cache || (process.env.NODE_ENV === 'production'),
			preventIndent: true,
			strict: true,
			settings: {
				layoutsDir: this.instance.files.layoutsDir,
				partialsDir: this.instance.files.partialsDir
			}
		};
		this._hbs = require('express-hbs').create();
		this._hbs.handlebars.logger.level = 0;
		this.compiler = Promise.promisify(this._hbs.express4(this.compileOptions.settings));
	}

	update() {
		this.compileOptions.settings.layoutsDir = this.instance.files.layoutsDir;
		this.compileOptions.settings.partialsDir = this.instance.files.partialsDir;
		delete this.compiler;
		this.compiler = Promise.promisify(this._hbs.express4(this.compileOptions.settings));
	}

	async init() {
		log.verbose(t('Exstatic.registering_helpers'));
		const resolverArgs = [require('./helpers')];
		const helpers = await this.instance.hook.executeHook(
			HOOK_NAME, resolverArgs
		);

		['sync', 'async'].forEach(type => {
			Object.keys(helpers[type]).forEach(helperName => {
				log.debug(t('Exstatic.registering_helper', {
					type,
					name: helperName
				}));
				const helperFn = helpers[type][helperName];
				this.registerHelperType(type, helperName, helperFn);
			});
		});

		log.verbose(t('Exstatic.helpers_registered'));
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
		return this.registerHelperType('async', ...args);
	}

	registerAsyncHelper(...args) {
		return this.registerHelperType('async', ...args);
	}

	updateTemplateOptions(...args) {
		return this._hbs.updateTemplateOptions(...args);
	}

	get SafeString() {
		return this._hbs.handlebars.SafeString;
	}

	get escapeExpression() {
		return this._hbs.handlebars.Utils.escapeExpression;
	}
}

module.exports = HandlebarsCompiler;
