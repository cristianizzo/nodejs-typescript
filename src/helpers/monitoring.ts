import * as toobusy from 'toobusy-js'
import logger from '@logger'

toobusy.maxLag(600)

toobusy.interval(2000)

toobusy.onLag((currentLag: number) => {
  logger.warn('too_busy', { currentLag })
})

export default {
  toobusy
}
