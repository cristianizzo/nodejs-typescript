import winston from 'winston';
import config from '../../../config';
import ExternalLogger from './external';
import Formats from './format';

const format = winston.format.combine(...[Formats.formatError(), winston.format.timestamp(), Formats.formatMachine()]);

const externalLogger = new ExternalLogger({
  name: 'external-logger',
  level: 'verbose',
});

const consoleFormat = winston.format.combine(...[
  winston.format.colorize(),
  Formats.consoleFormat({showDetails: true})
].filter((f) => f !== null));

const consoleLogLevel = config.REMOTE_EXECUTION ? 'warn' : config.LOG.LEVEL;
const consoleLogger = new winston.transports.Console({
  // name: 'console',
  format: consoleFormat,
  level: consoleLogLevel,
});

const transports = [externalLogger, consoleLogger];

const CustomLoggerMixin = {
  logMeta(...metas: object[]) {
    logger.defaultMeta = Object.assign({}, ...metas);
  },

  purge() {
    externalLogger.purge();
  }
};

const logger = Object.assign(
  winston.createLogger({
    level: 'debug',
    exitOnError: true,
    format,
    transports
  }),
  CustomLoggerMixin
);

export default logger;
