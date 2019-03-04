const debug = require('@exstatic/logging').debug('source-github');
const httpDebug = require('@exstatic/logging').debug('http:source-github');
const SourceBase = require('@exstatic/source-base');

const API_URL = 'https://api.github.com';
const GET_REPO_ID = '/repos/:user/:project';
const GET_CONTENTS = '/repositories/:id/contents/:path';

class GError extends SourceBase.Error {}

function urlFor(what, parts) {
	switch (what) {
		case 'meta': {
			const {user, project} = parts;
			if (!user || !project) {
				throw new GError('urlFor meta: user and project must be provided', 'ESG_META_URL_MISSING_PARTS');
			}

			return SourceBase.replaceParams(GET_REPO_ID, {user, project}).replace(/\/\/+/g, '/');
		}

		case 'contents': {
			const {id, path} = parts;
			if (!id || !path) {
				throw new GError('urlFor contents: id and path must be provided', 'ESG_CONTENTS_URL_MISSING_PARTS');
			}

			return SourceBase.replaceParams(GET_CONTENTS, {id, path}).replace(/\/\/+/g, '/');
		}

		default:
			throw new GError(`urlFor type ${what} not supported`, 'ESG_UNKNOWN_URL');
	}
}

function handlePossibleRateLimit(error) {
	if (!error.response) {
		throw error;
	}

	const {headers} = error.response;
	if (!headers || headers['x-ratelimit-remaining'] !== '0') {
		throw error;
	}

	let rateLimitResetMessage = headers['x-ratelimit-reset'];
	if (rateLimitResetMessage) {
		let resetTime = new Date(parseInt(rateLimitResetMessage, 10));
		resetTime = `${resetTime.getHours() + 1}:${resetTime.getMinutes().toString().padStart(2, '0')}`;
		rateLimitResetMessage = ` Rate limit resets at ${resetTime}`;
	} else {
		rateLimitResetMessage = '';
	}

	throw new GError(`Rate limited.${rateLimitResetMessage}`, 'EGS_RATE_LIMITED');
}

module.exports = class SourceGithub extends SourceBase {
	get defaults() {
		return Object.assign({
			headers: {
				accept: 'application/vnd.github.v3+json'
			},
			validateStatus: status => (status >= 200 && status < 300) || status === 304,
			baseURL: API_URL
		}, SourceBase.defaults);
	}

	get name() {
		return 'github';
	}

	configure(options = {}) {
		this.options = options;
		if (options.token) {
			this.request.defaults.headers.authorization = `token ${options.token}`;
		}
	}

	async getRepoId(user, project) {
		const cacheKey = `${user}/${project}`;
		if (this.store.hasPath(cacheKey)) {
			httpDebug('Getting repo ID from cache');
			return this.store.getContents(this.store.getEtagFromPath(cacheKey));
		}

		const {data} = await this.request(urlFor('meta', {user, project})).catch(handlePossibleRateLimit);
		// @note: not storing an actual etag for this because the repo id is constant
		await this.store.add(cacheKey, cacheKey.replace('/', '-'), data.id);
		return data.id;
	}

	async getSingle(config = {}) {
		debug('get single: ', JSON.stringify(config));
		if (config.repository) {
			[config.user, config.project] = config.repository.split('/');
			delete config.repository;
		}

		const {user, project, path} = config;

		if (!user || !project || !path) {
			throw new GError('GET: user, project and path must be supplied', 'ESG_GET_MISSING_PARAMS');
		}

		const key = `${user}/${project}/${path}`.replace(/\/\/+/g, '/');
		const savedEtag = this.store.getEtagFromPath(key);
		const id = await this.getRepoId(user, project);

		const headers = {};
		if (savedEtag) {
			headers['if-none-match'] = `"${savedEtag}"`;
		}

		const result = await this.request(urlFor('contents', {id, path}), {headers}).catch(handlePossibleRateLimit);

		if (savedEtag && result.status === 304) {
			httpDebug('Reading content from cache');
			const results = await this.store.getContents(savedEtag);

			// CASE: file access issue - we already verified that the etag exists.
			// If this is the case, the store will remove the etag it saved
			if (results instanceof SourceBase.InvalidString) {
				return this.getSingle(config);
			}

			result.data = JSON.parse(await this.store.getContents(savedEtag));
		} else if (result.status === 200) {
			httpDebug('Got new content from github');
			await this.store.removeEtag(savedEtag);
		}

		let {data, headers: {etag: newEtag}} = result;
		newEtag = newEtag.replace(/^"|"$/g, '');

		if (savedEtag !== newEtag) {
			debug('New etag for', key, 'from', savedEtag, 'to', newEtag);
			// Persist the raw response to cache. We might make modifications (e.g. the request was a directory),
			// but that should be able to resolved without hitting the API
			await this.store.add(key, newEtag, JSON.stringify(data));
		}

		if (Array.isArray(data)) {
			debug(key, 'is a dir');
			return Promise.all(data.map(({path}) => this.getSingle({user, project, path})));
		}

		debug(key, 'is a file');
		return Buffer.from(data.content, 'base64').toString();
	}

	run() {
		// @todo
	}

	query(options = {}) {
		return options;
	}
};
module.exports.GithubError = GError;
module.exports.urlFor = urlFor;
