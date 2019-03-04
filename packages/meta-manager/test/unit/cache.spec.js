const path = require('path');
const sinon = require('sinon');
const {expect} = require('chai');
const {fs, error} = require('@exstatic/utils');

const Cache = require('../../lib/cache');
const expectError = require('../../../../test-utils/expect-error');

const root = path.resolve(__dirname, '../fixtures/cache');

describe('Unit: meta-manager > cache', function () {
	let procStub;

	beforeEach(() => {
		procStub = sinon.stub(process, 'on').returns(process);
	});

	afterEach(() => {
		procStub.restore();
	});

	it('Exports correct data', function () {
		expect(Cache.error).to.equal(error);
		expect(Cache.InvalidString).to.be.ok;
		expect(new Cache.InvalidString()).to.be.instanceOf(String);
		expect(Cache).to.be.ok;
	});

	it('InvalidString adds isInvalid property', function () {
		expect(new Cache.InvalidString().isInvalid).to.be.true;
	});

	describe('ExstaticCacheManager', function () {
		describe('constructor', function () {
			it('constructs', function () {
				const instance = new Cache({root, namespace: 'working'});
				expect(instance.saveScheduled).to.be.false;
				expect(instance.lastSaved).to.equal(-1);
				expect(instance.wd).to.equal(path.resolve(root, 'working'));
			});

			it('constructor requires namespace', function () {
				try {
					// eslint-disable-next-line no-unused-vars
					const instance = new Cache();
					expectError();
				} catch (error) {
					expect(error).to.be.instanceOf(Cache.error);
					expect(error.code).to.equal('EX_CACHE_MISSING_NAMESPACE');
				}
			});

			it('defaults wd to cwd', function () {
				const instance = new Cache({namespace: 'test'});
				expect(instance.wd).to.equal(path.resolve(process.cwd(), 'test'));
			});
		});

		describe('scheduleSave', function () {
			const instance = new Cache({root, namespace: 'working'});
			instance.manifest = {};
			let ntStub;

			beforeEach(() => {
				ntStub = sinon.stub(process, 'nextTick');
			});

			afterEach(() => {
				ntStub.restore();
			});

			it('does not double schedule', function () {
				instance.saveScheduled = true;
				expect(instance.scheduleSave()).to.be.true;
				expect(ntStub.called).to.be.false;
			});

			it('deduplicate', function () {
				instance.saveScheduled = false;
				instance.lastSaved = Date.now() + 10000;
				expect(instance.scheduleSave()).to.be.false;
				expect(instance.dirty).to.be.true;
				expect(ntStub.calledOnce).to.be.false;
			});

			it('saves', function () {
				instance.lastSaved = -1;
				instance.saveScheduled = false;

				expect(instance.scheduleSave()).to.be.true;
				expect(ntStub.calledOnce).to.be.true;
				expect(ntStub.args[0][0]).to.equal(instance.__save);
			});
		});

		describe('forceSave', function () {
			it('clean', async function () {
				const instance = new Cache({root, namespace: 'working'});
				const writeStub = sinon.stub(fs, 'writeFile').resolves();
				try {
					await instance.forceSave();
					expect(writeStub.called).to.be.false;
				} finally {
					writeStub.restore();
				}
			});

			it('sync', function () {
				const instance = new Cache({root, namespace: 'working'});
				instance.dirty = true;
				const writeStub = sinon.stub(fs, 'writeFile').resolves();
				const writeSyncStub = sinon.stub(fs, 'writeFileSync');
				try {
					instance.forceSave(true);
					expect(writeStub.called).to.be.false;
					expect(writeSyncStub.calledOnce).to.be.true;
				} finally {
					writeStub.restore();
					writeSyncStub.restore();
				}
			});

			it('async', async function () {
				const instance = new Cache({root, namespace: 'working'});
				instance.dirty = true;
				const writeStub = sinon.stub(fs, 'writeFile').resolves();
				const writeSyncStub = sinon.stub(fs, 'writeFileSync');
				try {
					await instance.forceSave();
					expect(writeStub.called).to.be.true;
					expect(writeSyncStub.calledOnce).to.be.false;
				} finally {
					writeStub.restore();
					writeSyncStub.restore();
				}
			});

			// @todo
			it('updates properties', async function () {
				const instance = new Cache({root, namespace: 'working'});
				const writeStub = sinon.stub(fs, 'writeFile').resolves();
				const dateStub = sinon.stub(Date, 'now').returns(123321);
				instance.dirty = true;
				instance.lastSaved = -1;
				instance.saveScheduled = false;

				try {
					await instance.forceSave();
					expect(instance.dirty).to.be.false
					expect(instance.saveScheduled).to.be.false;
					expect(instance.lastSaved).to.equal(123321);
					expect(writeStub.calledOnce).to.be.true;
				} finally {
					writeStub.restore();
					dateStub.restore();
				}
			})
		});

		describe('init', function () {
			it('creates folder if needed', async function () {
				const instance = new Cache({root, namespace: 'fake'});
				const ensureStub = sinon.stub(fs, 'ensureDir');
				const folder = path.resolve(root, 'fake');
				sinon.stub(instance, 'scheduleSave');

				try {
					await instance.init();
					expect(ensureStub.calledWithExactly(folder)).to.be.true;
				} finally {
					ensureStub.restore();
				}
			});

			it('creates a manifest if needed', async function () {
				const instance = new Cache({root, namespace: 'no-manifest'});
				sinon.stub(instance, 'scheduleSave');

				await instance.init();
				expect(instance.scheduleSave.calledOnce).to.be.true;
				expect(instance.manifest).to.be.an('object');
				expect(instance.manifest.data).to.be.an('object');
				expect(instance.manifest.version).to.be.a('string');
			});

			it('errors with a bad manifest', async function () {
				const instance = new Cache({root, namespace: 'wrong-manifest'});
				sinon.stub(instance, 'scheduleSave');

				try {
					await instance.init();
					expectError();
				} catch (error) {
					expect(error).to.be.instanceof(Cache.error);
					expect(error.code).to.equal('EX_BAD_MANIFEST');
				}
			});

			it('errors with a bad manifest', async function () {
				const instance = new Cache({root, namespace: 'wrong-manifest-no-data'});

				try {
					await instance.init();
					expectError();
				} catch (error) {
					expect(error).to.be.instanceof(Cache.error);
					expect(error.code).to.equal('EX_BAD_MANIFEST');
				}
			});

			it('schedules exit hook', async function () {
				const instance = new Cache({root, namespace: 'working'});
				await instance.init();

				expect(instance.exitScheduled).to.be.true;
				expect(procStub.callCount).to.equal(4);

				expect(procStub.args[0][0]).to.equal('SIGINT');
				expect(procStub.args[1][0]).to.equal('SIGTERM');
				expect(procStub.args[2][0]).to.equal('beforeExit');
				expect(procStub.args[3][0]).to.equal('exit');

				await instance.init();
				expect(procStub.callCount).to.equal(4);
			});
		});

		it('add', async function () {
			const instance = new Cache({root, namespace: 'working'});
			await instance.init();

			const writeStub = sinon.stub(fs, 'writeFile').resolves();
			const scheduled = sinon.stub(instance, 'scheduleSave');

			try {
				await instance.add('/add-test', 'abc123', 'abc123CONTENTS');
				expect(writeStub.calledOnce).to.be.true;
				expect(writeStub.args[0][1]).to.equal('abc123CONTENTS');
				expect(instance.manifest.data['/add-test']).to.equal('abc123');
				expect(instance.valueCache).to.include('abc123');
				expect(scheduled.calledOnce).to.be.true;
			} finally {
				writeStub.restore();
			}
		});

		it('removeItem', async function () {
			const instance = new Cache({root, namespace: 'working'});
			await instance.init();

			const removeStub = sinon.stub(fs, 'remove').resolves();
			const scheduled = sinon.stub(instance, 'scheduleSave');

			try {
				expect(await instance.removeItem('/testing', 'test')).to.be.true;
				expect(removeStub.calledOnce).to.be.true;
				expect(scheduled.calledOnce).to.be.true;
				expect(Object.keys(instance.manifest.data)).to.be.empty;
				expect(instance.valueCache).to.be.empty;
			} finally {
				removeStub.restore();
			}
		});

		it('removeEtag', async function () {
			const instance = new Cache({root, namespace: 'working'});
			await instance.init();
			const removeItem = sinon.stub(instance, 'removeItem').resolves(true);

			expect(await instance.removeEtag('testing')).to.be.false;
			expect(removeItem.called).to.be.false;

			expect(await instance.removeEtag('test')).to.be.true;
			expect(removeItem.calledOnce).to.be.true;
		});

		it('removePath', async function () {
			const instance = new Cache({root, namespace: 'working'});
			await instance.init();
			const removeItem = sinon.stub(instance, 'removeItem').resolves(true);

			expect(await instance.removePath('/test')).to.be.false;
			expect(removeItem.called).to.be.false;

			expect(await instance.removePath('/testing')).to.be.true;
			expect(removeItem.calledOnce).to.be.true;
		});

		describe('etagPath', function () {
			const instance = new Cache({root, namespace: 'working'});
			before(() => instance.init());

			it('Disallows path traversal', function () {
				try {
					// eslint-disable-next-line no-unused-vars
					const result = instance.etagPath('/test');
					expectError();
				} catch (error) {
					expect(error).to.be.instanceOf(Cache.error);
					expect(error.code).to.equal('EX_CACHE_NAMESPACE_ESCAPE');
				}
			});

			it('resolves path properly', function () {
				const result = instance.etagPath('testing');
				expect(result).to.equal(path.resolve(instance.wd, 'testing.cache'));
			});
		});

		it('hasEtag', async function () {
			const instance = new Cache({root, namespace: 'working'});
			await instance.init();

			expect(instance.hasEtag('invalid-etag')).to.be.false;
			expect(instance.hasEtag('test')).to.be.true;
		});

		it('hasPath', async function () {
			const instance = new Cache({root, namespace: 'working'});
			await instance.init();

			expect(instance.hasPath('/does-not-exist')).to.be.false;
			expect(instance.hasPath('/testing')).to.be.true;
		});

		it('getEtagFromPath', async function () {
			const instance = new Cache({root, namespace: 'working'});
			await instance.init();

			const etag = instance.getEtagFromPath('/testing');
			expect(etag).to.equal('test');
		});

		it('getContents', async function () {
			const instance = new Cache({root, namespace: 'working'});
			await instance.init();

			expect((await instance.getContents('test')).trim()).to.equal('test.cache');
			expect(await instance.getContents('invalid-etag')).to.be.instanceOf(Cache.InvalidString);

			instance.valueCache.push('dead-file');
			const removeEtag = sinon.stub(instance, 'removeEtag');
			expect(await instance.getContents('dead-file')).to.be.instanceOf(Cache.InvalidString);
			expect(removeEtag.calledOnce).to.be.true;

			const readStub = sinon.stub(fs, 'readFile').rejects(new Error('catch me'));

			try {
				await instance.getContents('test');
				expectError();
			} catch (error) {
				expect(error.message).to.equal('catch me');
			} finally {
				readStub.restore();
			}
		});
	});
});
