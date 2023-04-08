import * as path from 'path'
import * as chaiAsPromised from 'chai-as-promised'
import logger from '../src/modules/logger'
import * as chaiDateString from 'chai-date-string'
import * as chai from 'chai'
logger.transports[0].level = 'silly'

declare const global: any

global.srcDir = path.resolve(path.join(__dirname, '../src'))
global.chai = chai
global.expect = chai.expect
chai.use(chaiAsPromised)
chai.use(chaiDateString)

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at: Promise', p, 'reason:', reason)
  process.exit(-1)
})
