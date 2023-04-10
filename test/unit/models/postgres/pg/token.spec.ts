import * as path from 'path'
import * as sinon from 'sinon'
import * as moment from 'moment'
import * as speakeasy from 'speakeasy'
import { expect } from 'chai'
import Models from '@postgresModels'
import postgres from '@modules/postgres'
import Utils from '@helpers/utils'
import cryptoHelper from '@helpers/crypto'
import config from '@config'
import { sequelizeMockingMocha } from 'sequelize-mocking'
import { IEnumTokenType, ITokenAttribute } from '@type/db/db'

describe('Model:token', () => {
  let sandbox: any = null
  let user: any
  let requestInfo: any

  sequelizeMockingMocha(postgres.sequelize, [path.resolve('test/mocks/users.json')], {
    logging: false
  })

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    user = await Models.User.findByPk('26a05507-0395-447a-bbbb-000000000000')

    requestInfo = {
      ip: '192.0.0.1',
      deviceId: 'deviceId',
      userAgentInfo: {
        type: 'Web',
        name: 'name',
        ua: 'ua',
        vendor: 'vendor'
      }
    }
    await user.update({ twoFactor: true })
  })

  afterEach(() => {
    sandbox && sandbox.restore()
  })

  describe('findByTypeAndValueWithUser', () => {
    it('Should find by type and value token with user', async () => {
      const token = await Models.Token.createForResetPassword(user, requestInfo)

      const tokenGet = await Models.Token.findByTypeAndValueWithUser(IEnumTokenType.RESET_PASSWORD, token!.value)

      expect(tokenGet.id).to.eq(token!.id)
      expect(tokenGet.User.id).to.eq(user.id)

      const tokenWrongType = await Models.Token.findByTypeAndValueWithUser(IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN, token!.value)
      expect(tokenWrongType).to.be.null
    })

    it('Should find by type and value token with user with opts', async () => {
      const token = await Models.Token.createForResetPassword(user, requestInfo)
      const tOpts = await postgres.transactionOptions()

      const tokenGet = await Models.Token.findByTypeAndValueWithUser(IEnumTokenType.RESET_PASSWORD, token!.value, tOpts)

      expect(tokenGet.id).to.eq(token!.id)
      expect(tokenGet.User.id).to.eq(user.id)

      const tokenWrongType = await Models.Token.findByTypeAndValueWithUser(IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN, token!.value, tOpts)
      expect(tokenWrongType).to.be.null
      await tOpts.transaction.commit()
    })
  })

  describe('createToken', () => {
    it('Should filterKeys', async () => {
      const token = await Models.Token.createToken(user.id, 'value1', IEnumTokenType.AUTH, requestInfo)

      const filterToken = token.filterKeys()
      expect(Object.keys(filterToken).length).to.eq(5)
      expect(filterToken.createdAt).to.be.exist
      expect(filterToken.updatedAt).to.be.exist
    })

    it('Should create token', async () => {
      const token = await Models.Token.createToken(user.id, 'value1', IEnumTokenType.AUTH, requestInfo)
      expect(token.id).to.exist
      expect(token.suspicious).to.eq(false)
      expect(token.deviceId).to.exist
      expect(token.extraValue).not.to.exist
    })

    it('Should create token without useragent', async () => {
      delete requestInfo.userAgentInfo
      const token = await Models.Token.createToken(user.id, 'value1', IEnumTokenType.AUTH, requestInfo)
      expect(token.id).to.exist
      expect(token.suspicious).to.eq(false)
      expect(token.deviceId).to.exist
      expect(token.extraValue).not.to.exist
    })

    it('Should create token with extra value', async () => {
      const token = await Models.Token.createToken(user.id, 'value1', IEnumTokenType.AUTH, requestInfo, 'extraValue1')
      expect(token.id).to.exist
    })

    it('Should create token with clientIp', async () => {
      const token = await Models.Token.createToken(user.id, 'value1', IEnumTokenType.AUTH, requestInfo)
      expect(token.id).to.exist
      expect(token.clientIp).to.be.eq(requestInfo.ip)
    })

    it('Should create token with tOpts', async () => {
      const tOpts = await postgres.transactionOptions()

      const token = await Models.Token.createToken(user.id, 'value1', IEnumTokenType.AUTH, requestInfo, null, tOpts)
      expect(token.id).to.exist

      await tOpts.transaction.commit()
    })
  })

  describe('createForLogin', () => {
    it('Should generate login token', async () => {
      const token = await Models.Token.createForLogin(user.id, requestInfo)

      expect(token.value).to.exist
      expect(token.UserId).to.eq(user.id)
      expect(token.type).to.eq(IEnumTokenType.AUTH)
      expect(token.clientIp).to.eq(requestInfo.ip)
      expect(token.deviceId).to.eq(requestInfo.deviceId)
      expect(token.userAgentInfo).to.be.deep.eq(requestInfo.userAgentInfo)
    })

    it('Should generate login token with tOpts', async () => {
      const tOpts = await postgres.transactionOptions()
      const token = await Models.Token.createForLogin(user.id, requestInfo, tOpts)

      expect(token.value).to.exist
      expect(token.UserId).to.eq(user.id)
      expect(token.type).to.eq(IEnumTokenType.AUTH)
      expect(token.clientIp).to.eq(requestInfo.ip)
      expect(token.deviceId).to.eq(requestInfo.deviceId)
      expect(token.userAgentInfo).to.be.deep.eq(requestInfo.userAgentInfo)
      await tOpts.transaction.rollback()
    })

    it('Should updateForce', async () => {
      const token = await Models.Token.createForLogin(user.id, requestInfo)
      const updatedAt = moment(token.updatedAt)

      await Utils.wait(500)
      await token.updateForce({ clientIp: requestInfo.ip } as ITokenAttribute)
      const updatedAt1 = moment(token.updatedAt)
      await token.reload()
      const updatedAt11 = moment(token.updatedAt)
      expect(updatedAt1.isSame(updatedAt11)).to.be.true
      expect(updatedAt.isBefore(updatedAt1)).to.be.true
      expect(token.clientIp).to.be.eq(requestInfo.ip)
      await token.updateForce({ clientIp: '1.0.1.0', extraValue: 'something' } as ITokenAttribute)
      await token.reload()
      expect(token.clientIp).to.be.eq('1.0.1.0')
      expect(token.extraValue).to.be.eq('something')

      expect(token.deviceId).to.eq(requestInfo.deviceId)
      expect(token.userAgentInfo).to.be.deep.eq(requestInfo.userAgentInfo)
    })
  })

  describe('createFor2FAEmail', () => {
    it('Should generate 2fa login token email', async () => {
      const spyRandomDigits = sandbox.spy(Utils, 'randomDigits')

      const { token } = await Models.Token.createFor2FAEmail(user, requestInfo)

      expect(token.value).to.exist
      expect(token.UserId).to.eq(user.id)
      expect(token.type).to.eq(IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN)
      expect(token.clientIp).to.be.eq(requestInfo.ip)
      expect(token.deviceId).to.eq(requestInfo.deviceId)
      expect(token.userAgentInfo).to.be.deep.eq(requestInfo.userAgentInfo)
      expect(spyRandomDigits.calledOnce)
      expect(spyRandomDigits.returnValues[0].length === 6).eq(true)
    })

    it('Should generate 2fa login token email with tOpts', async () => {
      const tOpts = await postgres.transactionOptions()
      const spyRandomDigits = sandbox.spy(Utils, 'randomDigits')

      const { token } = await Models.Token.createFor2FAEmail(user, requestInfo)

      expect(token.value).to.exist
      expect(token.UserId).to.eq(user.id)
      expect(token.type).to.eq(IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN)
      expect(token.clientIp).to.be.eq(requestInfo.ip)
      expect(token.deviceId).to.eq(requestInfo.deviceId)
      expect(token.userAgentInfo).to.be.deep.eq(requestInfo.userAgentInfo)
      expect(spyRandomDigits.calledOnce)
      expect(spyRandomDigits.returnValues[0].length === 6).eq(true)
      await tOpts.transaction.rollback()
      expect(await Models.Token.findByPk(token.id)).to.be.null
    })
  })

  describe('createForResetPassword', () => {
    it('Should generate reset password token', async () => {
      const generateSecret = sandbox.stub(speakeasy, 'generateSecret').returns({ base32: 'token' })
      const token = await Models.Token.createForResetPassword(user, requestInfo)

      expect(token!.value).to.eq('token')
      expect(token!.UserId).to.eq(user.id)
      expect(token!.type).to.eq(IEnumTokenType.RESET_PASSWORD)
      expect(generateSecret.calledOnce).to.be.true
    })

    it('Should generate reset password token with tOpts', async () => {
      const tOpts = await postgres.transactionOptions()

      const generateSecret = sandbox.stub(speakeasy, 'generateSecret').returns({ base32: 'token' })
      const token = await Models.Token.createForResetPassword(user, requestInfo, tOpts)

      expect(token!.value).to.eq('token')
      expect(token!.UserId).to.eq(user.id)
      expect(token!.type).to.eq(IEnumTokenType.RESET_PASSWORD)
      expect(generateSecret.calledOnce).to.be.true
      await tOpts.transaction.rollback()
      expect(await Models.Token.findByPk(token!.id)).to.be.null
    })

    it('Should generate reset password token remove previous existing tokens', async () => {
      sandbox.stub(speakeasy, 'generateSecret').returns({ base32: 'token' })
      await Models.Token.createForResetPassword(user, requestInfo)
      const tokenB = await Models.Token.createForResetPassword(user, requestInfo)

      const tokens = await Models.Token.findAll()

      expect(tokens.length).to.eq(1)
      expect(tokens[0].id).to.eq(tokenB!.id)
    })
  })

  describe('createFor2Fa', () => {
    it('Should generate 2 fa token', async () => {
      const { token } = await Models.Token.createFor2Fa(user, requestInfo)

      expect(token!.value).to.exist
      expect(token!.UserId).to.eq(user.id)
      expect(token!.clientIp).to.be.eq(requestInfo.ip)

      expect(token!.deviceId).to.eq(requestInfo.deviceId)
      expect(token!.userAgentInfo).to.be.deep.eq(requestInfo.userAgentInfo)
      expect(token!.type).to.eq(IEnumTokenType.TWO_FACTOR_LOGIN)
    })

    it('Should generate 2 fa token with tOpts', async () => {
      const tOpts = await postgres.transactionOptions()
      const { token } = await Models.Token.createFor2Fa(user, requestInfo)

      expect(token!.value).to.exist
      expect(token!.UserId).to.eq(user.id)
      expect(token!.clientIp).to.be.eq(requestInfo.ip)

      expect(token!.deviceId).to.eq(requestInfo.deviceId)
      expect(token!.userAgentInfo).to.be.deep.eq(requestInfo.userAgentInfo)
      expect(token!.type).to.eq(IEnumTokenType.TWO_FACTOR_LOGIN)
      await tOpts.transaction.rollback()
      expect(await Models.Token.findByPk(token!.id)).to.be.null
    })
  })

  describe('verify2FA', () => {
    it('Should verify2FA delete past tokens', async () => {
      await Models.Token.createFor2Fa(user, requestInfo)
      await Models.Token.createFor2Fa(user, requestInfo)

      const twoFaTokens = await user.getTokensByType(IEnumTokenType.TWO_FACTOR_LOGIN)
      expect(twoFaTokens.length).to.eq(1)
    })

    it('Should verify2FA token', async () => {
      const { token } = await Models.Token.createFor2Fa(user, requestInfo)

      const tfaCode = speakeasy.totp({
        secret: cryptoHelper.decrypt(token!.value, config.CIPHER_2FA),
        encoding: 'base32'
      })

      const res = await Models.Token.verify2FA(user, tfaCode, {})

      expect(res).to.be.true
    })

    it('Should verify2FA token with tOpts', async () => {
      const tOpts = await postgres.transactionOptions()
      const { token } = await Models.Token.createFor2Fa(user, requestInfo, tOpts)
      const tfaCode = speakeasy.totp({
        secret: cryptoHelper.decrypt(token!.value, config.CIPHER_2FA),
        encoding: 'base32'
      })

      const res = await Models.Token.verify2FA(user, tfaCode, {}, tOpts)

      expect(res).to.be.true
      await tOpts.transaction.rollback()
    })

    it('Should verify2FA token and update the client ip', async () => {
      const { token } = await Models.Token.createFor2Fa(user, requestInfo)

      const tfaCode = speakeasy.totp({
        secret: cryptoHelper.decrypt(token!.value, config.CIPHER_2FA),
        encoding: 'base32'
      })
      const newClientIp = '1.0.2.3'
      const res = await Models.Token.verify2FA(user, tfaCode, { ip: newClientIp })
      await token!.reload()
      expect(token!.clientIp).to.be.eq(newClientIp)

      expect(token!.deviceId).to.eq(requestInfo.deviceId)
      expect(token!.userAgentInfo).to.be.deep.eq(requestInfo.userAgentInfo)
      expect(res).to.be.true
    })

    it('Should throw verify2FA if no token', async () => {
      await expect(Models.Token.verify2FA(user, '', {})).to.be.rejectedWith(Error, 'two_factor_token_required')
    })

    it('Should not pass verify2FA if token with wrong code', async () => {
      sandbox.stub(Utils, 'randomDigits').returns('123456')

      await Models.Token.createFor2Fa(user, requestInfo)

      await expect(Models.Token.verify2FA(user, 'oijioj', {})).to.be.rejectedWith(Error, 'two_factor_code_invalid')
    })

    it('Should verify2FA token email', async () => {
      sandbox.stub(Utils, 'randomDigits').returns('123456')

      await user.update({ twoFactor: false })
      await Models.Token.createFor2FAEmail(user, requestInfo)

      const res = await Models.Token.verify2FA(user, '123456', {})

      expect(res).to.be.true
    })

    it('Should not pass verify2FA token email if expired', async () => {
      sandbox.stub(Utils, 'randomDigits').returns('123456')

      const oldApiMailPinExpiration = config.SERVICES.API_USER.MAIL_PIN_EXPIRATION
      config.SERVICES.API_USER.MAIL_PIN_EXPIRATION = 0

      await user.update({ twoFactor: false })
      await Models.Token.createFor2FAEmail(user, requestInfo)

      await expect(Models.Token.verify2FA(user, '123456', {})).to.be.rejectedWith(Error, 'token_expired')
      config.SERVICES.API_USER.MAIL_PIN_EXPIRATION = oldApiMailPinExpiration
    })

    it('Should not pass verify2FA if token email with wrong code', async () => {
      await user.update({ twoFactor: false })
      await Models.Token.createFor2FAEmail(user, requestInfo)

      await expect(Models.Token.verify2FA(user, 'oijioj', {})).to.be.rejectedWith(Error, 'two_factor_code_invalid')
    })

    it('Should not pass verify2FA if token without code', async () => {
      await Models.Token.createFor2Fa(user, requestInfo)

      await expect(Models.Token.verify2FA(user, '', {})).to.be.rejectedWith(Error, 'two_factor_code_required')
    })
  })

  describe('createForChangeEmail', () => {
    it('Should generate change email token', async () => {
      const token = await Models.Token.createForChangeEmail(user, 'new@email.com', requestInfo)

      expect(token!.value).to.exist
      expect(token!.extraValue).to.eq('new@email.com')
      expect(token!.UserId).to.eq(user.id)
      expect(token!.type).to.eq(IEnumTokenType.CHANGE_EMAIL)
    })

    it('Should generate change email token with tOpts', async () => {
      const tOpts = await postgres.transactionOptions()
      const token = await Models.Token.createForChangeEmail(user, 'new@email.com', requestInfo, tOpts)
      expect(token!.value).to.exist
      expect(token!.extraValue).to.eq('new@email.com')
      expect(token!.UserId).to.eq(user.id)
      expect(token!.type).to.eq(IEnumTokenType.CHANGE_EMAIL)
      await tOpts.transaction.rollback()
      expect(await Models.Token.findByPk(token!.id)).to.be.null
    })
  })
})
