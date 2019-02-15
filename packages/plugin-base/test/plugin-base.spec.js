const sinon = require('sinon');
const {expect} = require('chai');

const Base = require('../lib/plugin-base');

describe('Package > Plugin Base', () => {
	let instance;

	beforeEach(() => {
		instance = new Base();
	});

	it('index exports base', function () {
		expect(require('../index.js')).to.equal(Base); // eslint-disable-line unicorn/import-index
	});

	it('constructs', function () {
		expect(instance).to.be.ok;
	});

	it('class contains required functions', function () {
		expect(instance.configure).to.be.a('function');
		expect(instance.registerHooks).to.be.a('function');
		expect(instance.hookWrite).to.be.a('function');
		expect(instance.addPages).to.be.a('function');
		expect(instance.registerHelpers).to.be.a('function');
		expect(instance.write).to.be.a('function');
	});

	it('configure is functional', function () {
		const ctx = {testing: true};
		instance.configure(ctx);
		expect(instance.options).to.deep.equal(ctx);
	});

	it('registers hooks', function () {
		const register = sinon.stub();
		instance.registerHooks(register);

		expect(register.callCount).to.equal(3);
		expect(register.calledWith('load-pages')).to.be.true;
		expect(register.calledWith('register-helpers')).to.be.true;
		expect(register.calledWith('pre-write')).to.be.true;
	});

	it('hooks call proper fns', function () {
		const register = sinon.stub();
		instance.registerHooks(register);

		instance.addPages = sinon.stub();
		instance.registerHelpers = sinon.stub();
		instance.hookWrite = sinon.stub();

		expect(register.callCount).to.equal(3);

		register.args[0][1]();
		expect(instance.addPages.calledOnce).to.be.true;
		register.args[1][1]();
		expect(instance.registerHelpers.calledOnce).to.be.true;
		register.args[2][1]();
		expect(instance.hookWrite.calledOnce).to.be.true;
	});

	it('load pages', function () {
		expect(instance.addPages()).to.be.ok;
	});

	it('register helpers', function () {
		expect(instance.registerHelpers()).to.be.ok;
	});

	it('pre-write', async function () {
		const fakeFiles = ['File', 'File', 'File'];
		const newFiles = ['new', 'new'];

		expect(instance.write(fakeFiles)).to.deep.equal(fakeFiles);

		instance.write = sinon.stub().returns(undefined);
		expect(await instance.hookWrite(fakeFiles)).to.deep.equal(fakeFiles);
		expect(instance.write.calledOnce).to.be.true;

		instance.write.reset();
		instance.write.returns(newFiles);
		expect(await instance.hookWrite(fakeFiles)).to.deep.equal(newFiles);
		expect(instance.write.calledOnce).to.be.true;
	});
});
