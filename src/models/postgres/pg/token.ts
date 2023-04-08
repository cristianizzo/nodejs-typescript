import { v4 as uuidv4 } from 'uuid'
import * as moment from 'moment'
import * as speakeasy from 'speakeasy'
import { DataTypes, Sequelize } from 'sequelize'
import { IEnumTokenType, ITokenAttribute, ITokenInstance, IUserAttribute } from '@type/db/db'
import { assert, assertExposable } from '@helpers/errors'
import Utils from '@helpers/utils'
import crypto from '@helpers/crypto'
import config from '@config'
import { ITxOpts } from '@type/db/transaction'

export default function (sequelize: Sequelize): ITokenInstance {
  const Token = sequelize.define<ITokenAttribute>(
    'Token',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv4()
      },
      value: {
        type: DataTypes.STRING,
        allowNull: false
      },
      extraValue: {
        type: DataTypes.STRING,
        allowNull: true
      },
      clientIp: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM(...Object.values(IEnumTokenType)),
        allowNull: false
      },
      userAgentInfo: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
      },
      deviceId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      suspicious: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      extra: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
      }
    },
    {
      indexes: [{ unique: false, fields: ['value'] }],
      freezeTableName: true,
      timestamps: true
    }
  ) as ITokenInstance

  Token.prototype.updateForce = function (params: ITokenAttribute, tOpts: ITxOpts) {
    this.changed('updatedAt', true)
    return this.update({ updatedAt: new Date(Date.now()), ...params }, tOpts)
  }

  Token.findByTypeAndValueWithUser = async (type, value, tOpts) => {
    return await (Token.findOne(
      Object.assign(
        {
          where: { value, type },
          include: [{ model: sequelize.model('User'), required: true }]
        },
        tOpts
      )
    ) as Promise<ITokenAttribute & { User: IUserAttribute }>)
  }

  Token.createToken = async (userId: string, value: string, type, requestInfo, extraValue = null, tOpts): Promise<ITokenAttribute> => {
    assert(!!(userId && value && type && requestInfo.ip), 'missing parameters')

    const rawToken: any = {
      value,
      type,
      UserId: userId,
      extraValue,
      clientIp: requestInfo.ip,
      userAgentInfo: requestInfo.userAgentInfo != null ?? {},
      deviceId: requestInfo.deviceId ?? null
    }

    return await Token.create(rawToken, tOpts)
  }

  Token.createForLogin = async (userId, requestInfo, tOpts): Promise<ITokenAttribute> => {
    const token = speakeasy.generateSecret({ length: 20 }).base32

    return await Token.createToken(userId, token, IEnumTokenType.AUTH, requestInfo, null, tOpts)
  }

  Token.createFor2FAEmail = async (user, requestInfo, tOpts) => {
    await user.removeTokensByType(IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN, tOpts)

    const pinCode = Utils.randomDigits()
    const encryptedPin = crypto.encrypt(pinCode, config.CIPHER_2FA)

    const token = await Token.createToken(user.id, encryptedPin, IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN, requestInfo, null, tOpts)

    return {
      token,
      pinCode
    }
  }

  Token.createForResetPassword = async (user, requestInfo, tOpts) => {
    await user.removeTokensByType(IEnumTokenType.RESET_PASSWORD, tOpts)

    const secretKey = speakeasy.generateSecret({ length: 20 })

    return await Token.createToken(user.id, secretKey.base32, IEnumTokenType.RESET_PASSWORD, requestInfo, null, tOpts)
  }

  Token.createFor2Fa = async (user, requestInfo, tOpts) => {
    await user.removeTokensByType(IEnumTokenType.TWO_FACTOR_LOGIN, tOpts)

    const secretKey = speakeasy.generateSecret({ length: 20 })
    const encryptedSecretKey = crypto.encrypt(secretKey.base32, config.CIPHER_2FA)

    const token = await Token.createToken(user.id, encryptedSecretKey, IEnumTokenType.TWO_FACTOR_LOGIN, requestInfo, null, tOpts)
    return {
      token,
      secret: secretKey.base32
    }
  }

  Token.createForChangeEmail = async (user, extraValue, requestInfo, tOpts) => {
    await user.removeTokensByType(IEnumTokenType.CHANGE_EMAIL, tOpts)

    const secretKey = speakeasy.generateSecret({ length: 20 })

    return await Token.createToken(user.id, secretKey.base32, IEnumTokenType.CHANGE_EMAIL, requestInfo, extraValue, tOpts)
  }

  Token.verify2FA = async (user, twoFaCode, requestInfo, tOpts) => {
    const tokenType = user.twoFactor ? IEnumTokenType.TWO_FACTOR_LOGIN : IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN

    const twoFaTokens = await user.getTokensByType(tokenType, tOpts)
    const twoFaToken = twoFaTokens[0]

    assertExposable(!!twoFaToken, 'two_factor_token_required', 400, null)
    assertExposable(!!twoFaCode, 'two_factor_code_required')

    const tokenValue = crypto.decrypt(twoFaToken.value, config.CIPHER_2FA)

    if (user.twoFactor) {
      const tokenValidates = speakeasy.totp.verify({
        secret: tokenValue,
        encoding: 'base32',
        token: twoFaCode
      })

      assertExposable(tokenValidates, 'two_factor_code_invalid')

      if (requestInfo?.ip) {
        await twoFaToken.update({ clientIp: requestInfo.ip }, tOpts)
      }
    } else {
      assertExposable(tokenValue === twoFaCode, 'two_factor_code_invalid')
      await twoFaToken.destroy(tOpts)
      assertExposable(
        moment(twoFaToken.updatedAt).isAfter(moment().subtract({ minutes: config.SERVICES.API_USER.MAIL_PIN_EXPIRATION })),
        'token_expired'
      )
    }

    return true
  }

  return Token
}
