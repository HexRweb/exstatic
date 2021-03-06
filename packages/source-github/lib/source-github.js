const API_URL = 'https://api.github.com';
const SourceBase = require('@exstatic/source-base');
const {sha1} = require('@exstatic/utils');
const GError = require('./error');
const urlFor = require('./get-url');
const handlePossibleRateLimit = require('./request-rate-limit');
const transformConfig = require('./transform-config');

module.exports = class SourceGithub extends SourceBase {
	get defaults() {
		return {headers: {
			accept: 'application/vnd.github.v3+json'
		},
		validateStatus: status => (status >= 200 && status < 300) || status === 304,
		baseURL: API_URL, ...SourceBase.defaults};
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
			this.httpDebug('Getting repo ID from cache');
			return this.store.getContents(this.store.getEtagFromPath(cacheKey));
		}

		const {data} = await this.request(urlFor('meta', {user, project})).catch(handlePossibleRateLimit);
		// @note: not storing an actual etag for this because the repo id is constant
		await this.store.add(cacheKey, cacheKey.replace('/', '-'), data.id);
		return data.id;
	}

	async getSingle(config = {}) {
		this.debug('get single: ', config);
		transformConfig(config, ['user', 'project', 'path']);

		const {user, project, path} = config;
		const key = `${user}/${project}/${path}`.replace(/\/\/+/g, '/').toLowerCase();
		const savedEtag = this.store.getEtagFromPath(key);
		const id = await this.getRepoId(user, project);

		const headers = {};
		if (savedEtag) {
			const originalEtag = savedEtag.replace(sha1.hex(key), '').replace(/^-/, '');
			headers['if-none-match'] = `"${originalEtag}"`;
		}

		const result = await this.request(urlFor('contents', {id, path}), {headers}).catch(handlePossibleRateLimit);
		await this.updateStoreIfNeeded(result, savedEtag);

		// CASE: file access issue - we already verified that the etag exists.
		// If this is the case, the store will remove the etag it saved
		if (result.data instanceof SourceBase.InvalidString) {
			return this.getSingle(config);
		}

		// CASE: read from store, need to parse the content as JSON
		if (typeof result.data === 'string') {
			result.data = JSON.parse(result.data);
		}

		let {data, headers: {etag: newEtag}} = result;
		newEtag = newEtag.replace(/^"|"$/g, '');
		// Add unique identifier to etag - etags in github can be duplicated
		newEtag = `${sha1.hex(key)}-${newEtag}`;

		if (savedEtag !== newEtag) {
			this.debug('New etag for', key, 'from', savedEtag, 'to', newEtag);
			// Persist the raw response to cache. We might make modifications (e.g. the request was a directory),
			// but that should be able to resolved without hitting the API
			await this.store.add(key, newEtag, JSON.stringify(data));
		}

		if (Array.isArray(data)) {
			this.debug(key, 'is a dir');
			if (config.recursive) {
				const children = await Promise.all(data.map(({path}) => this.getSingle({user, project, path})));
				return children.flat();
			}

			const promises = [];

			for (const {path, type} of data) {
				if (type !== 'file') {
					continue;
				}

				// eslint-disable-next-line promise/prefer-await-to-then
				promises.push(this.getSingle(({user, project, path})).then(payload => payload[0]));
			}

			return Promise.all(promises);
		}

		this.debug(key, 'is a file');
		return [{
			path,
			data: Buffer.from(data.content, 'base64')
		}];
	}

	async run(config) {
		const data = await this.getSingle(config);
		return data;
	}

	query(options = {}) {
		return options;
	}
};

module.exports.GithubError = GError;
