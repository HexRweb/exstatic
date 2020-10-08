const path = require('path');
const {expect} = require('chai');
const {emptyDir, exists, readFile} = require('@exstatic/utils').fs;
const hash = require('../../../../test-utils/hash');

process.env.EXSTATIC_LOG_LEVEL = 'error';
const {Exstatic} = require('../../lib/exstatic');

describe('Integration > Full Build', () => {
	let previousDir;
	const root = path.resolve(__dirname, '../fixtures/test-instance/');
	before(() => {
		previousDir = process.cwd();
		process.chdir(root);
	});

	after(async () => {
		await emptyDir(path.resolve(root, './build'));
		process.chdir(previousDir);
	});

	it('All files are correctly written', async () => {
		const instance = new Exstatic();
		await instance.initialize();
		await instance.loadFiles();
		await instance.write();

		const files = [
			'./build/test/clean/index.html',
			'./build/nested-directories/file/index.html',
			'./build/nested-directories/level-2/potato/index.html',
			'./build/custom-layout/index.html'
		];

		const descriptions = [
			'custom path',
			'nested directories',
			'nested directories - multi-level',
			'custom layout'
		];

		const filesExists = await Promise.all(files.map(name => exists(name)));

		filesExists.forEach((file, index) => {
			expect(file, `${descriptions[index]} exists`).to.be.true;
		});

		const fileContents = await Promise.all(files.map(name => readFile(name, 'utf8')));

		const fileHashes = [
			'k2NvoEdACRnTpvosV6EUWWVG2XyWgWRe2Ff7AU+4+xg=',
			'NL4gwDX00McKZRFujLoVAIr2zwesAd1E4gmhh3rlsV0=',
			'y8AM7SounqoHTSdHkzpPR5vKBlHu5qhXuFkYaDZtPBA=',
			'OCF3oJk0b981glKGh+08rt7jH7Cfgqdmdaao9HJMi64='
		];

		fileContents.forEach((file, index) => {
			expect(hash(file), `${descriptions[index]} compiled properly`).to.equal(fileHashes[index]);
		});
	});
});
