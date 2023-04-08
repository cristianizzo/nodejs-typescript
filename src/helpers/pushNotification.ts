import OneSignal from 'onesignal-node'
import config from '../../config'
import logger from '@logger'
import * as errors from '../helpers/errors'

const llo = logger.logMeta.bind(null, { service: 'helpers:pushNotification' })

const PushNotification = {
  client: new OneSignal.Client(config.ONE_SIGNAL.APP_ID, config.ONE_SIGNAL.API_KEY),

  async _send(content, userId, data: any = {}) {
    if (!config.REMOTE_EXECUTION) {
      return false
    }

    const opts = {
      contents: {
        en: content
      },
      url: data.url,
      data,
      filters: [
        {
          field: 'tag',
          key: 'userId',
          relation: 'exist',
          value: userId
        }
      ]
    }

    return await PushNotification.client
      .createNotification(opts)
      .then(() => true)
      .catch((error) => {
        errors.throwError('Failed to send notification', {
          error,
          content,
          userId
        })
      })
  },

  async send(content, userId, logInfo = {}) {
    errors.assert(content && userId, 'missing_params', {
      content,
      userId,
      logInfo
    })

    logger.info('sendNotification', llo(logInfo))
    return await PushNotification._send(content, userId, logInfo)
  }
}

export default PushNotification
