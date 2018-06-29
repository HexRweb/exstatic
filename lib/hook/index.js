'use strict';

const Promise = require('bluebird');
const log = require('../log');
const t = require('../translations');
const Hook = require('./hook');

const KNOWN_HOOKS = ['pre-register_helpers', 'post-document_generation'];

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
