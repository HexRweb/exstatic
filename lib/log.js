const winston = require('winston');

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.colorize(),
		winston.format.json()
	),
	transports: [
		new winston.transports.File({filename: 'exstatic.log', level: 'silly'}),
		new winston.transports.File({filename: 'exstatic.error.log', level: 'error'}),
		new winston.transports.Console({format: winston.format.simple(), level: 'silly'})
	]
});

logger.level = ['error', 'info', 'verbose', 'debug', 'silly']
	.includes((process.env.EXSTATIC_LOG_LEVEL || '').toLowerCase()) ?
	process.env.EXSTATIC_LOG_LEVEL : 'info';

module.exports = logger;
