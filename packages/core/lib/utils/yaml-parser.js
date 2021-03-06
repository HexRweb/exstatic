// Modified version of Jekyll's regex - https://git.io/flblI
// Javascript doesn't support \A so the parsing is a bit more complicated :(
const YML_REGEX = new RegExp(/^-{3}\s*\n.*?\n?([\s\S]+)?^-{3}\s*$\n?/, 'm');
const yaml = require('js-yaml');
const {fs} = require('.');

async function loadYaml(filename) {
	const contents = await fs.readFile(filename, 'utf8');
	return yaml.safeLoad(contents);
}

function getYaml(data) {
	// No need to trim the data because it's trimmed when it's read in the
	// file class

	/*
	** Since js doesn't support the \A flag, we also need to test that the first
	** character is a `-` to make sure data actually contains yaml

	** Note: this isn't foolproof, but it's the least convoluted solution we
	** have for now. If the excessive trimming becomes an issue (i.e. loss of
	** whitespace), we can come back and look at this.
	*/

	// If the file doesn't contain YAML, we need to return an empty object;
	if (!(YML_REGEX.test(data) && data.indexOf('-') === 0)) {
		return {};
	}

	let yml = data.match(YML_REGEX)[0].trim();

	// Remove the first and last lines which are the wrappers (`---`)
	yml = yml.split('\n');

	// CASE: there is no data - return nothing
	if (yml.length < 3) {
		return {};
	}

	yml.pop();
	yml.shift();

	yml = yml.join('\n').trim();

	return yaml.safeLoad(yml);
}

function stripYaml(data) {
	const yml = data.match(YML_REGEX);

	if (yml && data.indexOf('-') === 0) {
		return data.replace(yml[0].trim(), '').trim();
	}

	return data;
}

module.exports = {
	loadYaml,
	getYaml,
	stripYaml
};
