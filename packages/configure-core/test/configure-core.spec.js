const sinon = require('sinon');
const {expect} = require('chai');

const Core = require('../lib/configure-core');

describe('Package > Configure Core', () => {
	let instance;

	beforeEach(() => {
		instance = new Core();
	});

	it('index exports core', function () {
		expect(require('../index.js')).to.equal(Core); // eslint-disable-line unicorn/import-index
	});

	it('constructs', function () {
		expect(instance).to.be.ok;
	});

	it('class contains required functions', function () {
		expect(instance.configure).to.be.a('function');
		expect(instance.registerHooks).to.be.a('function');
		expect(instance.hookCreated).to.be.a('function');
		expect(instance.hookWrite).to.be.a('function');
		expect(instance.addPages).to.be.a('function');
		expect(instance.registerHelpers).to.be.a('function');
		expect(instance.pagesCreated).to.be.a('function');
		expect(instance.write).to.be.a('function');
	});

	it('configure is functional', function () {
		let ctx = {testing: true};
		instance.configure(ctx);
		expect(instance.options).to.deep.equal(ctx);
	});

	it('registers hooks', function () {
		const register = sinon.stub();
		instance.registerHooks(register);

		expect(register.callCount).to.equal(4);
		expect(register.calledWith('load-pages')).to.be.true;
		expect(register.calledWith('register-helpers')).to.be.true;
		expect(register.calledWith('post-page_generation')).to.be.true;
		expect(register.calledWith('pre-write')).to.be.true;
	});

	it('hooks call proper fns', function () {
		const register = sinon.stub();
		instance.registerHooks(register);

		instance.addPages = sinon.stub();
		instance.registerHelpers = sinon.stub();
		instance.hookWrite = sinon.stub();
		instance.hookCreated = sinon.stub();


		expect(register.callCount).to.equal(4);

		register.args[0][1]();
		expect(instance.addPages.calledOnce).to.be.true;
		register.args[1][1]();
		expect(instance.registerHelpers.calledOnce).to.be.true;
		register.args[2][1]();
		expect(instance.hookCreated.calledOnce).to.be.true;
		register.args[3][1]();
		expect(instance.hookWrite.calledOnce).to.be.true;
	});

	it('load pages', function () {
		expect(instance.addPages()).to.be.ok;
	});

	it('register helpers', function () {
		expect(instance.registerHelpers()).to.be.ok;
	});

	it('created', function () {
		const fakeFiles = ['File', 'File', 'File'];
		const newFiles = ['new', 'new'];

		expect(instance.pagesCreated(fakeFiles)).to.deep.equal(fakeFiles);

		instance.pagesCreated = sinon.stub().returns(undefined);
		expect(instance.hookCreated(fakeFiles)).to.deep.equal(fakeFiles);
		expect(instance.pagesCreated.calledOnce).to.be.true;

		instance.pagesCreated.reset();
		instance.pagesCreated.returns(newFiles);
		expect(instance.hookCreated(fakeFiles)).to.deep.equal(newFiles);
		expect(instance.pagesCreated.calledOnce).to.be.true;
	});

	it('pre-write', function () {
		const fakeFiles = ['File', 'File', 'File'];
		const newFiles = ['new', 'new'];

		expect(instance.write(fakeFiles)).to.deep.equal(fakeFiles);

		instance.write = sinon.stub().returns(undefined);
		expect(instance.hookWrite(fakeFiles)).to.deep.equal(fakeFiles);
		expect(instance.write.calledOnce).to.be.true;

		instance.write.reset();
		instance.write.returns(newFiles);
		expect(instance.hookWrite(fakeFiles)).to.deep.equal(newFiles);
		expect(instance.write.calledOnce).to.be.true;
	});
});
