const {expect} = require('chai');
const utils = require('../../../lib/utils/file');

describe.only('Unit > Utils > File', () => {
	describe('title', () => {
		const {title} = utils;

		it('backslashes', () => {
			expect(title(undefined, '\\nested\\path')).to.equal('path');
		});

		it('sentences', () => {
			expect(title(undefined, '/What is the meaning of life?')).to.equal('What is the meaning of life?');
		});

		it('all the slashes', () => {
			expect(title(undefined, '/category/book/novel/')).to.equal('novel');
		});

		it('explicit paths', () => {
			expect(title(undefined, '/error.html')).to.equal('error');
		});

		it('uppercase', () => {
			expect(title(undefined, '/I-LOVE-TO-SCREAM')).to.equal('I LOVE TO SCREAM');
		});

		it('strips file extensions', () => {
			expect(title(undefined, '/post/2013.02.01/about-me.pdf')).to.equal('about me');
		});

		it('pass in override', () => {
			expect(title('About Jane Anne Doe', '/author/doe/jane/anne')).to.equal('About Jane Anne Doe');
		});
	});

	describe('fileName', () => {
		const {fileName} = utils;

		it('backslashes', () => {
			expect(fileName('\\nested\\path')).to.equal('nested/path/index.html');
		});

		it('illegal characters', () => {
			expect(fileName('/what is the meaning of life?')).to.equal('what-is-the-meaning-of-life/index.html');
		});

		it('all the slashes', () => {
			expect(fileName('/category/book/novel/')).to.equal('category/book/novel/index.html');
		});

		it('explicit paths', () => {
			expect(fileName('/error.html', true)).to.equal('error.html');
		});

		it('explicit paths', () => {
			expect(fileName('/error', true)).to.equal('error/index.html');
		});

		it('uppercase paths are converted to lower case', () => {
			expect(fileName('/I-LOVE-TO-SCREAM')).to.equal('i-love-to-scream/index.html');
		});

		it('custom file extensions', () => {
			expect(fileName('/post/2013.02.01/about-me.pdf')).to.equal('post/2013.02.01/about-me.pdf/index.html');
		});

		it('custom file extensions (explicit)', () => {
			expect(fileName('/post/2013.02.01/about-me.pdf', true)).to.equal('post/2013.02.01/about-me.pdf');
		});
	});
});
