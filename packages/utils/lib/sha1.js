const crypto = require('crypto');

module.exports = data => crypto.createHash('sha1').update(data);
module.exports.hex = data => crypto.createHash('sha1').update(data).digest('hex');
module.exports.base64 = data => crypto.createHash('sha1').update(data).digest('base64');
