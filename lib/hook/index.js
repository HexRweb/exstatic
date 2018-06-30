'use strict';

const Promise = require('bluebird');
const log = require('../log');
const t = require('../translations');
const Hook = require('./hook');

const KNOWN_HOOKS = ['pre-register_helpers', 'post-document_generation', 'pre-write'];
const SYNC_HOOKS = ['pre-write'];

class HookManager {
	constructor() {
		this.hooks = {};

		KNOWN_HOOKS.forEach(hook => {
			this.hooks[hook] = [];
		});
	}

	generateHookRegisterer(caller = '(internal)') {
		return (action, fn) => {
			if (!this.hooks[action]) {
				log.error(t('HookManager.registered_unknown_hook', {
					hook: action,
					plugin: caller
				}));
				return;
			}

			this.hooks[action].push(new Hook(fn, caller));
		};
	}

	executeHook(hook, ...args) {
		if (!this.hooks[hook]) {
			return Promise.reject(t('HookManager.called_unknown_hook', {hook}));
		}

		/*
		** There are 2 types of hooks - hooks which don't modify the input, and hooks that do. We
		** could add diffing logic to hooks that modify the input, but that's a lot of unnecessary
		** work (both for developers and performance). Instead, for sync hooks we reduce the second
		** argument, using the hooks execution as the reduction function. What this means is when
		** a sync hook is being executed, it can either be getting data fresh from the caller, or it
		** can be getting mutated data from a different hook. In the end, it doesn't matter because
		** there's an expectation that the hook function returns a result similar to the input
		*/
		if (SYNC_HOOKS.includes(hook)) {
			return Promise.reduce(this.hooks[hook], (resolver, singleHook) =>
				singleHook.executeSync(resolver, ...args).catch(() => resolver), args.shift());
		}

		// For hooks which are just providing data, the hook resolver will handle reducing the hook
		// results
		return Promise.mapSeries(this.hooks[hook], singleHook =>
			singleHook.execute(...args).catch(error => {
				log.debug(t('HookManager.execution_failed', {
					plugin: singleHook.caller,
					hook,
					error
				}));
				return false;
			})
		).filter(Boolean);
	}
}

module.exports = HookManager;
