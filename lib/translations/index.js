'use strict';

// @todo: add support for automatic locale determination

const translate = require('node-translate');

// @todo: Can you translate? Reach out to us (via github or email <hello@hexr.org>) if you would like to help!
translate.requireLocales({
	en: require('./en.json')
}).setLocale('en');

module.exports = translate.t.bind(translate);
