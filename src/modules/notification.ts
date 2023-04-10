import { IRequestInfo } from '@type/system/requestInfo'
import { IEnumEnvironment } from '@type/config/config'
import config from '@config'
import Mail from '@helpers/mail'
import { IUserRes } from '@type/routers/res/user'
import PushNotification from '@helpers/pushNotification'

const Notification = {
  // User

  async validateEmail(user: IUserRes) {
    const logInfo = { userId: user.id, notification: 'welcome', url: config.DEEPLINK_APP }

    await Promise.all([PushNotification.send(`🎉 Welcome on board! We ́re so happy you ́re here.`, user.id, logInfo)])

    return true
  },

  async askLogin(user: IUserRes, tokenValue: string, requestInfo?: IRequestInfo) {
    const url = `${config.DEEPLINK_APP}/ask-login?email=${user.email}&pinCode=${tokenValue}`
    const logInfo: any = { userId: user.id, notification: 'ask-login', url }

    if (config.ENVIRONMENT === IEnumEnvironment.dev) {
      logInfo.tokenValue = tokenValue
    }

    return await Mail.send(
      {
        toEmail: user.email,
        toName: `${user.firstName} ${user.lastName}`,
        dynamicContent: {
          name: user.firstName,
          pin: tokenValue,
          url
        },
        templateId: 'd-templateId'
      },
      logInfo
    )
  },

  async login(user: IUserRes, requestInfo?: IRequestInfo) {
    const url = config.DEEPLINK_APP
    const logInfo: any = { userId: user.id, notification: 'login', url }

    await Promise.all([
      Mail.send(
        {
          toEmail: user.email,
          toName: `${user.firstName} ${user.lastName}`,
          dynamicContent: {
            name: user.firstName,
            url
          },
          templateId: 'd-templateId'
        },
        logInfo
      ),
      PushNotification.send(`😃 Welcome back!.`, user.id, logInfo)
    ])

    return true
  },

  async logout(userId: string) {
    const url = config.DEEPLINK_APP
    const logInfo: any = { userId, notification: 'logout', url }

    return await PushNotification.send(`🙁 Log out? We hope to see you back soon! 😉`, userId, logInfo)
  },

  async askChangeEmail(user: IUserRes, newEmail: string, tokenValue: string) {
    const url = `${config.DEEPLINK_APP}/change-email/${tokenValue}`
    const logInfo: any = { userId: user.id, notification: 'ask-change-email' }

    if (config.ENVIRONMENT === IEnumEnvironment.dev) {
      logInfo.tokenValue = tokenValue
    }

    return await Mail.send(
      {
        toEmail: newEmail,
        toName: `${user.firstName} ${user.lastName}`,
        dynamicContent: {
          name: user.firstName,
          url
        },
        templateId: 'd-templateId'
      },
      logInfo
    )
  },

  async emailChanged(user: IUserRes) {
    const url = config.DEEPLINK_APP
    const logInfo = { userId: user.id, notification: 'email-changed', url }

    await Promise.all([
      Mail.send(
        {
          toEmail: user.email,
          toName: `${user.firstName} ${user.lastName}`,
          dynamicContent: {
            name: user.firstName,
            url
          },
          templateId: 'd-templateId'
        },
        logInfo
      ),
      PushNotification.send(`✅ Your email has been changed.`, user.id, logInfo)
    ])

    return true
  },

  async askResetPassword(user: IUserRes, tokenValue: string) {
    const url = `${config.DEEPLINK_APP}/reset-password/${tokenValue}`
    const logInfo: any = { userId: user.id, notification: 'ask-reset-password' }

    if (config.ENVIRONMENT === IEnumEnvironment.dev) {
      logInfo.tokenValue = tokenValue
    }

    return await Mail.send(
      {
        toEmail: user.email,
        toName: `${user.firstName} ${user.lastName}`,
        dynamicContent: {
          name: user.firstName,
          url
        },
        templateId: 'd-templateId'
      },
      logInfo
    )
  },

  async passwordChanged(user: IUserRes) {
    const url = config.DEEPLINK_APP
    const logInfo: any = { userId: user.id, notification: 'password-changed', url }

    await Promise.all([
      Mail.send(
        {
          toEmail: user.email,
          toName: `${user.firstName} ${user.lastName}`,
          dynamicContent: {
            name: user.firstName,
            url
          },
          templateId: 'd-templateId'
        },
        logInfo
      ),
      PushNotification.send(`✅ Your password has been changed.`, user.id, logInfo)
    ])

    return true
  },

  async twoFaDisabled(user: IUserRes, requestInfo: IRequestInfo) {
    const url = config.DEEPLINK_APP
    const logInfo: any = { userId: user.id, notification: '2fa-disabled', url }

    await Promise.all([
      Mail.send(
        {
          toEmail: user.email,
          toName: `${user.firstName} ${user.lastName}`,
          dynamicContent: {
            name: user.firstName,
            url
          },
          templateId: 'd-templateId'
        },
        logInfo
      ),
      PushNotification.send(`✅ Your 2FA has been disabled!`, user.id, logInfo)
    ])

    return true
  },

  async accountBlocked(user: IUserRes) {
    const url = config.DEEPLINK_APP

    const logInfo = { userId: user.id, notification: 'account-blocked', url }

    await Promise.all([
      Mail.send(
        {
          toEmail: user.email,
          toName: `${user.firstName} ${user.lastName}`,
          dynamicContent: {
            name: user.firstName,
            url
          },
          templateId: 'd-templateId'
        },
        logInfo
      ),
      PushNotification.send(`🆘 Your account has been blocked due to too many wrong login attempts.`, user.id, logInfo)
    ])

    return true
  }
}

export default Notification
