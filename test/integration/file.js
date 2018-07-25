const path = require('path');
const sinon = require('sinon');
const {expect} = require('chai');
const hash = require('../utils/hash');

const File = require('../../lib/file');

describe('Integration > File', function () {
	describe('Parsing', function () {
		const fixturesPath = path.resolve(__dirname, '../fixtures/');

		function getFile(name) {
			return (new File({
				location: path.resolve(fixturesPath, `${name}.hbs`),
				directory: fixturesPath,
				url: 'https://localhost:3000',
				compiler: sinon.stub(),
				tempFolder: '/tmp'
			})).extractMeta();
		}

		it('Generic Files', function () {
			return getFile('generic-file').then(file => {
				const expectedFileMeta = {
					title: 'Generic File',
					page: true,
					// Generated through extractMeta
					path: '/generic-file/',
					slug: 'generic-file'
				};
				expect(file.meta).to.deep.equal(expectedFileMeta);
				expect(hash(file.hbs)).to.equal('69k5saSnIMIcITGMDTI7QrbIhwRX6AjlT01ehqTo6mY=');
			});
		});

		it('Files with only metadata', function () {
			return getFile('only-meta').then(file => {
				const expectedFileMeta = {
					title: 'Only Metadata',
					page: false,
					description: 'This file contains only metadata',
					slug: 'only-meta',
					path: '/only-meta/'
				};

				expect(file.meta).to.deep.equal(expectedFileMeta);
				expect(file.hbs).to.equal('');
			});
		});

		it('Files with only content', function () {
			return getFile('no-meta').then(file => {
				const expectedFileMeta = {
					slug: 'no-meta',
					path: '/no-meta/'
				};

				expect(file.meta).to.deep.equal(expectedFileMeta);
				expect(hash(file.hbs)).to.equal('Kaw0SDnF3wqIpDcTC5CE2GG+K2vVjel+nHDPLRwXJQg=');
			});
		});

		it('Files with delimiters but no content', function () {
			return getFile('delim-no-meta', file => {
				const expectedFileMeta = {
					slug: 'delim-no-meta',
					path: '/delim-no-meta/'
				};

				expect(file.meta).to.deep.equal(expectedFileMeta);
				expect(hash(file.hbs)).to.equal('8jCPJ/lJZGmsCD4Y17DIxnvNCR9rM2wXLE7GVO+N7sY=');
			});
		});
	});
});

