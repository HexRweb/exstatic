const {expect} = require('chai');
const utils = require('../../../lib/utils/file');

describe.only('Unit > Utils > File', function () {
	describe('title', function () {
		const { title } = utils;

		it('backslashes', function () {
			expect(title(undefined, '\\nested\\path')).to.equal('path');
		});

		it('sentences', function () {
			expect(title(undefined, '/What is the meaning of life?')).to.equal('What is the meaning of life?');
		});

		it('all the slashes', function () {
			expect(title(undefined, '/category/book/novel/')).to.equal('novel');
		});

		it('explicit paths', function () {
			expect(title(undefined, '/error.html')).to.equal('error');
		});

		it('uppercase', function () {
			expect(title(undefined, '/I-LOVE-TO-SCREAM')).to.equal('I LOVE TO SCREAM');
		});

		it('strips file extensions', function () {
			expect(title(undefined, '/post/2013.02.01/about-me.pdf')).to.equal('about me');
		});

		it('pass in override', function () {
			expect(title('About Jane Elizabeth Doe', '/author/doe/jane/elizabeth')).to.equal('About Jane Elizabeth Doe')
		});
	});

	describe('fileName', function () {
		const {fileName} = utils;

		it('backslashes', function () {
			expect(fileName('\\nested\\path')).to.equal('nested/path/index.html');
		});

		it('illegal characters', function () {
			expect(fileName('/what is the meaning of life?')).to.equal('what-is-the-meaning-of-life/index.html');
		});

		it('all the slashes', function () {
			expect(fileName('/category/book/novel/')).to.equal('category/book/novel/index.html');
		});

		it('explicit paths', function () {
			expect(fileName('/error.html')).to.equal('error.html');
		});

		it('uppercase paths are converted to lower case', function () {
			expect(fileName('/I-LOVE-TO-SCREAM')).to.equal('i-love-to-scream/index.html');
		});

		it('custom file extensions', function () {
			expect(fileName('/post/2013.02.01/about-me.pdf')).to.equal('post/2013.02.01/about-me.pdf');
		});
	});
});
