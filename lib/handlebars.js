const Promise = require('bluebird');

class HandlebarsCompiler {
	constructor(exstaticInstance) {
		this.compileOptions = {
			cache: opts.cache || (process.env.NODE_ENV === 'production'),
			preventIndent: true,
			strict: true,
			settings: {
				layoutsDir: this.layoutsDir,
				partialsDir: this.partialsDir
			}
		};
		this.instance = exstaticInstance;
		this._hbs = require('express-hbs').create();
		this._hbs.handlebars.logger.level = 0;
		this.compiler = Promise.promisify(this._hbs.express4(this.compileOptions.settings));
	}

	executeRegisterHelper(helperType, helperName, helperAction) {
		if (['sync', 'async'].includes(helperType)) {
			throw new TypeError('helperType must be `sync` or `async`');
		}

		if (typeof helperName !== 'string') {
			throw new TypeError('helperName must be a string');
		}

		if (typeof helperAction !== 'function') {
			throw new TypeError('helperAction must be a function');
		}

		const self = this;
		const proxyFn = function bindToExstatic(...args) {
			let bound = this;
			if (typeof bound === 'string') {
				bound = { value: this };
			}

			bound.instance = self.instance;

			return helperAction.call(bound, ...args);
		};

		const hbsFn = helperType === 'sync' ? 'registerHelper' : 'registerAsyncHelper';

		return this._hbs[hbsFn](name, proxyFn);
	}

	generateCompiler (path, pageContext) {
		const context = Object.assign({}, this.compileOptions, pageContext);
		return this.compiler(path, context);
	}

	registerHelper(...args) {
		return this.registerHelper('async', ...args);
	}

	registerAsyncHelper(...args) {
		return this.registerHelper('async', ...args);
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
