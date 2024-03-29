import axios from 'axios'
import config from '@config'
import logger from '@logger'
import { assert } from '@errors'
import { IEnumEnvironment } from '@type/config/config'

const llo = logger.logMeta.bind(null, { service: 'mail' })

interface IMailBody {
  template_id: string
  content: Array<{ type: string; value: string }>
  mail_settings: { sandbox_mode: { enable: boolean } }
  from: { email: string; name: string }
  reply_to: { email: string; name: string }
  personalizations: Array<{
    subject: string
    to: Array<{ email: string; name: string }>
    headers: Record<string, string>
    dynamic_template_data: Record<string, any>
  }>
  attachments?: any
}

const Mail = {
  async _rpCall(body: IMailBody): Promise<any> {
    return await axios.post(config.MAIL.SENDGRID_URI, body, {
      headers: {
        Authorization: `Bearer ${config.MAIL.SENDGRID_API_KEY}`
      }
    })
  },

  async _send(
    { toEmail, toName, subject = '', templateId, dynamicContent = {}, attachments = null, calEvent = null }: any,
    logInfo: any = {}
  ): Promise<boolean> {
    if (!config.REMOTE_EXECUTION) {
      return false
    }

    const prefix = config.ENVIRONMENT === IEnumEnvironment.prod ? '' : `[${config.ENVIRONMENT}] `

    const body: IMailBody = {
      template_id: templateId,
      content: [
        {
          type: 'text/html',
          value: '<html lang="en"></html>'
        }
      ],
      mail_settings: {
        sandbox_mode: {
          enable: false
        }
      },
      from: {
        email: config.MAIL.FROM_EMAIL,
        name: config.APP_NAME
      },
      reply_to: {
        email: config.MAIL.REPLY_EMAIL,
        name: config.APP_NAME
      },
      personalizations: [
        {
          subject: `${prefix}${subject}`,
          to: [
            {
              email: toEmail,
              name: toName
            }
          ],
          headers: {
            'X-Accept-Language': 'en',
            'X-Mailer': 'AgreeWe'
          },
          dynamic_template_data: Object.assign(
            {
              subject: `${prefix}${subject}`,
              name: toName,
              email: toEmail,
              env: config.ENVIRONMENT === IEnumEnvironment.prod ? '' : `[${config.ENVIRONMENT}] `
            },
            dynamicContent
          )
        }
      ]
    }

    if (attachments != null) {
      body.attachments = attachments
    }

    if (calEvent != null) {
      body.content.push({
        type: 'text/calendar; method=REQUEST',
        value: calEvent
      })
    }

    try {
      await Mail._rpCall(body)

      logger.verbose('sendMail', logInfo)

      return true
    } catch (error) {
      logger.error(
        'Failed to send mail',
        llo({
          error,
          toEmail,
          toName,
          templateId,
          dynamicContent
        })
      )
      return false
    }
  },

  async send(opts: any, logInfo: any = {}): Promise<boolean> {
    assert(opts?.toEmail && opts?.toName, 'missing_params', {
      opts,
      logInfo
    })

    if (config.MAIL.SENDGRID_ENABLED) {
      return await Mail._send(opts, logInfo)
    }

    return false
  }
}

export default Mail
