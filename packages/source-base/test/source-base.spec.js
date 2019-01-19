const {expect} = require('chai');
const sinon = require('sinon');

const Base = require('../lib/source-base');

describe('Test > Source Base', function () {
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

	it('getting name throws an error by default', function () {
		try {
			const name = instance.name; // eslint-disable-line prefer-destructuring, no-unused-vars
			throw new Error('expected an error to be thrown');
		} catch (error) {
			expect(error.message).to.equal('Name was not implemented');
		}
	});

	it('setting name does not do anything', function () {
		instance.name = 'test';

		try {
			const {name} = instance; // eslint-disable-line no-unused-vars
			throw new Error('expected an error to be thrown');
		} catch (error) {
			expect(error.message).to.equal('Name was not implemented');
		}
	});

	it('configure throws an error by default', function () {
		try {
			instance.configure();
			throw new Error('expected an error to be thrown');
		} catch (error) {
			expect(error.message).to.equal('Configure was not implemented');
		}
	});

	it('run throws an error by default', function () {
		try {
			instance.run();
			throw new Error('expected an error to be thrown');
		} catch (error) {
			expect(error.message).to.equal('Run was not implemented');
		}
	});

	it('properly registers helper hook', function () {
		instance.register = sinon.stub();
		const registerHook = sinon.stub();

		instance.registerHooks(registerHook);

		expect(registerHook.calledOnce).to.be.true;
		expect(registerHook.args[0][0]).to.equal('pre-register_helpers');
		expect(registerHook.args[0][1]).to.be.a('function');

		registerHook.args[0][1]();

		expect(instance.register.calledOnce).to.be.true;
	});

	it('registers hooks properly', function () {
		const response = instance.register.call({name: 'test'});

		expect(response).to.be.an('object').with.keys(['async']);
		expect(response.async).to.be.an('object').with.keys(['test']);
		expect(response.async.test).to.be.a('function');
	});

	it('registered hook calls run', function () {
		const run = sinon.stub();
		const ctx = {name: 'test', run};
		const {async} = instance.register.call(ctx);
		async.test('this', 'is', 'a', 'test', 1);
		expect(run.calledOnce).to.be.true;
		expect(run.calledWithExactly('this', 'is', 'a', 'test', 1)).to.be.true;
	});
});
