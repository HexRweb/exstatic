const SourceBase = require('@exstatic/source-base');
const GError = require('./error');

const GET_REPO_ID = '/repos/:user/:project';
const GET_CONTENTS = '/repositories/:id/contents/:path';

module.exports = function urlFor(what, parts) {
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
};
