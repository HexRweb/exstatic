const Promise = require('bluebird');

/*
* @name: mapAsync
* @description: Array.prototype.map for async functions; waits for all promises to resolve
* @param: {array}<Array> - the array to iterate over
* @param: {iterFn}<Function> - the async function to run in each iteration
* @return: {resolutions}<Array> - the resolved values
* @note: iterFn is called with params (array[index], index, array)
*/

module.exports = function mapAsync(array, iterFn) {
	// eslint-disable-next-line unicorn/no-fn-reference-in-iterator
	return Promise.resolve(array).map(iterFn);
};
