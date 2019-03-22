const Promise = require('bluebird');

/*
* @name: mapSeries
* @description: wait for {iterFn} to run for every element of {array}. Similar to Bluebird.mapSeries
* @param: {array}<Array> - the array to iterate over
* @param: {iterFn}<Function> - the async function to run in each iteration
* @return: {resolutions}<Array> - the resolved values
* @note: iterFn is called with params (array[index], index, array)
*/

module.exports = async function mapAsyncSeries(array, iterFn) {
	return Promise.resolve(array).mapSeries(iterFn);
};
