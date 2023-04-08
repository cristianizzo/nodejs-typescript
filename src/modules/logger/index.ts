import * as winston from 'winston'
import ExternalLogger from '@modules/logger/external'
import config from '@config'
import Formats from '@modules/logger/format'
import Utils from '@helpers/utils'

const format = winston.format.combine(...[Formats.formatError(), winston.format.timestamp(), Formats.formatMachine()])

const externalLogger: any = new ExternalLogger({
  name: 'external-logger',
  level: 'verbose'
})

const consoleFormat = winston.format.combine(
  ...[winston.format.colorize(), Formats.consoleFormat({ showDetails: true })].filter((f) => f !== null)
)

const consoleLogLevel = config.REMOTE_EXECUTION ? 'warn' : config.LOG.LEVEL
const consoleLogger = new winston.transports.Console({
  format: consoleFormat,
  level: consoleLogLevel
})

const transports = [externalLogger, consoleLogger]

const logger: any = winston.createLogger({
  level: 'debug',
  exitOnError: true,
  format,
  transports
})

logger.purge = () => {
  externalLogger.purge()
}

logger.logMeta = (...metas: object[]) => Object.assign({}, ...metas)

Utils.defaultError = (error) => logger.error(error.message, { error })

export default logger
