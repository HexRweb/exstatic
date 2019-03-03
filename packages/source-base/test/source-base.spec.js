const {expect} = require('chai');
const sinon = require('sinon');

const expectError = require('../../../test-utils/expect-error');
const Base = require('../lib/source-base');

class FunctionalBase extends Base {
	get name() {
		return 'test';
	}
}

describe('Package > Source Base', function () {
	let instance;

	beforeEach(() => {
		instance = new FunctionalBase();
	});

	it('constructs', function () {
		expect(instance).to.be.ok;
	});

	it('requires name to be implemented', function () {
		try {
			instance = new Base();
			expectError();
		} catch (error) {
			expect(error.message).to.equal('Name was not implemented');
		}
	});

	it('setting name does not do anything', function () {
		instance.name = 'fake-test';
		expect(instance.name).to.equal('test');
	});

	it('configure throws an error by default', function () {
		try {
			instance.configure();
			expectError();
		} catch (error) {
			expect(error.message).to.equal('Configure was not implemented');
		}
	});

	it('run throws an error by default', function () {
		try {
			instance.run();
			expectError();
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
