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
				writePath: '/tmp',
				directory: fixturesPath,
				url: 'https://localhost:3000',
				compiler: sinon.stub(),
				tempFolder: '/tmp'
			})).extractMeta();
		}

		it('Generic Files', async function () {
			const file = await getFile('generic-file');
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

		it('Files with only metadata', async function () {
			const file = await getFile('only-meta');
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

		it('Files with only content', async function () {
			const file = await getFile('no-meta');
			const expectedFileMeta = {
				title: 'no-meta',
				slug: 'no-meta',
				path: '/no-meta/'
			};

			expect(file.meta).to.deep.equal(expectedFileMeta);
			expect(hash(file.hbs)).to.equal('9ww3CYkueKXosF1jHTX61at2GM8C/iykLsCEn4yTBJk=');
		});

		it('Files with metadata delimiters but no metadata', async function () {
			const file = await getFile('delim-no-meta');
			const expectedFileMeta = {
				title: 'delim-no-meta',
				slug: 'delim-no-meta',
				path: '/delim-no-meta/'
			};

			expect(file.meta).to.deep.equal(expectedFileMeta);
			expect(hash(file.hbs)).to.equal('8jCPJ/lJZGmsCD4Y17DIxnvNCR9rM2wXLE7GVO+N7sY=');
		});
	});
});

