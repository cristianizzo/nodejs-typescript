import * as path from 'path'
import * as sinon from 'sinon'
import * as speakeasy from 'speakeasy'
import { expect } from 'chai'
import config from '@config'
import Models from '@postgresModels'
import UserController from '@api-user/v1/controllers/user'
import postgres from '@modules/postgres'
import cryptoHelper from '@helpers/crypto'
import { sequelizeMockingMocha } from 'sequelize-mocking'
import { IEnumTokenType, ITokenAttribute, IUserAttribute } from '@type/db/db'
import Utils from '@helpers/utils'
import Notification from '@modules/notification'

describe('Controller: Users', () => {
  let sandbox: any = null
  let stubNotificationValidateEmail: sinon.SinonStub
  let stubNotificationLogin: sinon.SinonStub
  let stubNotificationAskResetPassword: sinon.SinonStub
  let stubNotificationPasswordChanged: sinon.SinonStub
  let stubNotificationTwoFaDisabled: sinon.SinonStub
  let stubNotificationAccountBlocked: sinon.SinonStub
  let stubAskLogin: sinon.SinonStub
  let rawUser1: any
  let user1: any
  let requestInfo: any

  sequelizeMockingMocha(postgres.sequelize, [path.resolve('test/mocks/userRole.json'), path.resolve('test/mocks/users.json')], {
    logging: false
  })

  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    config.ALLOW_SIGNUP = true
    stubNotificationValidateEmail = sandbox.stub(Notification, 'validateEmail').resolves(true)
    stubNotificationLogin = sandbox.stub(Notification, 'login').resolves(true)
    stubNotificationAskResetPassword = sandbox.stub(Notification, 'askResetPassword').resolves(true)
    stubNotificationPasswordChanged = sandbox.stub(Notification, 'passwordChanged').resolves(true)
    stubNotificationTwoFaDisabled = sandbox.stub(Notification, 'twoFaDisabled').resolves(true)
    stubNotificationAccountBlocked = sandbox.stub(Notification, 'accountBlocked').resolves(true)

    rawUser1 = {
      firstName: 'firstName1',
      lastName: 'lastName1',
      email: 'default@email.com',
      password: 'pass1',
      isActive: true,
      verifyEmail: true
    }

    user1 = await Models.User.create({ ...rawUser1 })
    requestInfo = { ip: '192.0.0.1' }
  })

  afterEach(() => {
    config.ALLOW_SIGNUP = true
    sandbox && sandbox.restore()
  })

  describe('Create', () => {
    beforeEach(() => {
      stubAskLogin = sandbox.stub(UserController, 'askLogin').resolves({ type: 'email' })
    })

    it('Should create user', async () => {
      const password = 'pass1'
      const rawUser = {
        firstName: 'firstName1',
        lastName: 'lastName1',
        email: '1@email.com',
        password,
        termsVersion: '1.1'
      }

      const res = await UserController.createUser(rawUser, requestInfo)

      expect(res).to.be.deep.eq({ type: 'email' })
      const user = (await Models.User.findByEmail(rawUser.email)) as IUserAttribute

      expect(user.email).eq(rawUser.email)
      expect(user.password).to.exist
      expect(user.password).not.to.eq(password)
      expect(stubAskLogin.calledOnce).to.be.true
      expect(
        stubAskLogin.calledWith(
          {
            email: rawUser.email,
            password: rawUser.password
          },
          requestInfo
        )
      ).to.be.true
    })

    it('Disable signup', async () => {
      config.ALLOW_SIGNUP = false
      await expect(UserController.createUser(rawUser1, requestInfo)).to.be.rejectedWith(Error, 'signup_disabled')
    })

    it('Should not create user if email already exist', async () => {
      const stubCheckFailedlogin = sandbox.stub(UserController, '_checkFailedLoginAttempts')

      const user = await Models.User.create({
        firstName: 'firstName1',
        lastName: 'lastName1',
        email: 'alfredo@email.com',
        password: rawUser1.password,
        isActive: true,
        verifyEmail: true
      } as IUserAttribute)

      const rawUser = {
        firstName: 'firstName2',
        lastName: 'lastName2',
        email: 'alfredo@email.com',
        password: 'hackpass1'
      }

      const res = await UserController.createUser(rawUser as IUserAttribute, requestInfo)

      expect(res).to.be.deep.eq({ type: 'email' })
      const users = await Models.User.findAll()
      const userMatchEmail = users.filter((userGet) => userGet.email === user.email)
      expect(userMatchEmail.length).to.be.eq(1)
      expect(userMatchEmail[0].id).to.be.eq(user.id)
      expect(stubAskLogin.callCount).to.be.eq(0)
      expect(stubCheckFailedlogin.calledOnce).to.be.true
      expect(stubCheckFailedlogin.args[0][0].id).to.be.eq(user.id)
    })

    it('Should not create and ask login if password correct', async () => {
      const user = await Models.User.create({
        firstName: 'firstName1',
        lastName: 'lastName1',
        email: 'alfredo@email.com',
        password: rawUser1.password,
        isActive: true,
        verifyEmail: true
      } as IUserAttribute)

      const rawUser = {
        firstName: 'firstName2',
        lastName: 'lastName2',
        email: 'alfredo@email.com',
        password: rawUser1.password
      }

      const res = await UserController.createUser(rawUser as IUserAttribute, requestInfo)

      expect(res).to.be.deep.eq({ type: 'email' })
      const users = await Models.User.findAll()
      const userMatchEmail = users.filter((userGet) => userGet.email === user.email)
      expect(userMatchEmail.length).to.be.eq(1)
      expect(userMatchEmail[0].id).to.be.eq(user.id)
      expect(stubAskLogin.calledOnce).to.be.true
      expect(
        stubAskLogin.calledWith(
          {
            email: rawUser.email,
            password: rawUser.password
          },
          requestInfo
        )
      ).to.be.true
    })
  })

  describe('Update', () => {
    it('Should update a user', async () => {
      const params = {
        firstName: 'firstNameChanged',
        lastName: 'lastNameChanged',
        termsVersion: '1.3'
      }

      const userInfo = await UserController.update(user1, params)

      await user1.reload()

      expect(userInfo.firstName).eq(params.firstName)
      expect(userInfo.lastName).eq(params.lastName)
      expect(userInfo.termsVersion).eq(params.termsVersion)

      expect(user1.firstName).eq(params.firstName)
      expect(user1.lastName).eq(params.lastName)
      expect(user1.termsVersion).eq(params.termsVersion)
    })
  })

  describe('With user', () => {
    let rawDemoUser: any
    let demoUser: any
    let pinCode: string
    let token2faEmail: any

    beforeEach(async () => {
      rawDemoUser = {
        firstName: 'firstName1',
        lastName: 'lastName1',
        email: 'dev@amon.tech',
        password: rawUser1.password,
        isActive: true,
        verifyEmail: true,
        termsVersion: '1.1'
      }

      demoUser = await Models.User.create({ ...rawDemoUser })
      pinCode = '123456'
      sandbox.stub(Utils, 'randomDigits').returns(pinCode)
      const { token } = await Models.Token.createFor2FAEmail(user1, requestInfo)
      token2faEmail = token
    })

    describe('Ask login', () => {
      it('Cannot ask login if password invalid and increase countLoginFailed', async () => {
        const isActive = user1.isActive
        await expect(
          UserController.askLogin(
            {
              email: rawUser1.email,
              password: 'password'
            },
            requestInfo
          )
        ).to.be.rejectedWith(Error, 'bad_credentials')
        await user1.reload()
        expect(user1.countLoginFailed).to.eq(1)
        expect(user1.isActive).to.eq(isActive)
      })

      it('Cannot ask login if password invalid and set the user to inactive if countLoginFailed >= 10 attempts', async () => {
        await user1.update({
          countLoginFailed: 9
        })
        await expect(
          UserController.askLogin(
            {
              email: rawUser1.email,
              password: 'password'
            },
            requestInfo
          )
        ).to.be.rejectedWith(Error, 'bad_credentials')
        await user1.reload()
        expect(user1.countLoginFailed).to.eq(10)
        expect(user1.isActive).to.eq(false)
        const user = await Models.User.findByEmail(user1.email)
        expect(stubNotificationAccountBlocked.calledWith(user?.filterKeys())).to.be.true
      })

      it('Cannot ask login if user is not active', async () => {
        await user1.update({ isActive: false })
        await expect(
          UserController.askLogin(
            {
              email: rawUser1.email,
              password: rawUser1.password
            },
            requestInfo
          )
        ).to.be.rejectedWith(Error, 'bad_credentials')
      })

      it('Should ask login with enable 2fa', async () => {
        await user1.update({ twoFactor: true })
        const res = await UserController.askLogin(
          {
            email: rawUser1.email,
            password: rawUser1.password
          },
          requestInfo
        )

        expect(res.type).to.be.eq('2fa')
      })

      it('Should ask login', async () => {
        const stubTokenCreateForToFAEmail: sinon.SinonStub = sandbox
          .stub(Models.Token, 'createFor2FAEmail')
          .resolves({ token: { value: 'token' }, pinCode: '123456' })
        const stubNotificationAskLogin: sinon.SinonStub = sandbox.stub(Notification, 'askLogin').resolves(true)
        const requestInfo = { ip: '1.1.1.1' }
        const res = await UserController.askLogin(
          {
            email: rawUser1.email,
            password: rawUser1.password
          },
          requestInfo
        )

        expect(res.type).to.be.eq('email')
        expect(stubTokenCreateForToFAEmail.args[0][0].id).to.eq(user1.id)
        expect(stubNotificationAskLogin.calledOnce).to.be.true
        expect(stubNotificationAskLogin.args[0][0].id).to.eq(user1.id)
        expect(stubNotificationAskLogin.args[0][1]).to.eq('123456')
        expect(stubNotificationAskLogin.args[0][2]).to.eq(requestInfo)
        expect(stubNotificationAccountBlocked.calledOnce).to.be.false
      })

      it('Should ask login not verify', async () => {
        await user1.update({ isActive: true, verifyEmail: false })
        const stubTokenCreateForToFAEmail = sandbox
          .stub(Models.Token, 'createFor2FAEmail')
          .resolves({ token: { value: 'token' }, pinCode: '123456' })
        const stubNotificationAskLogin = sandbox.stub(Notification, 'askLogin').resolves(true)
        const requestInfo = { ip: '1.1.1.1' }
        const res = await UserController.askLogin(
          {
            email: rawUser1.email,
            password: rawUser1.password
          },
          requestInfo
        )

        expect(res.type).to.be.eq('email')
        expect(stubTokenCreateForToFAEmail.args[0][0].id).to.eq(user1.id)
        expect(stubNotificationAskLogin.calledOnce).to.be.true
        expect(stubNotificationAskLogin.args[0][0].id).to.eq(user1.id)
        expect(stubNotificationAskLogin.args[0][1]).to.eq('123456')
        expect(stubNotificationAskLogin.args[0][2]).to.eq(requestInfo)
      })

      it('Should ask login ignoring fake demo account', async () => {
        const oldDemo = config.DEMO_ACCOUNT
        config.DEMO_ACCOUNT = demoUser.email

        await expect(
          UserController.askLogin(
            {
              email: 'fake-email',
              password: 'any'
            },
            requestInfo
          )
        ).rejectedWith(Error, 'bad_credentials')

        config.DEMO_ACCOUNT = oldDemo
      })
    })

    describe('Login', () => {
      it('Should login', async () => {
        const requestInfo = { ip: '1.1.1.1' }
        const { user, token } = await UserController.login(
          {
            email: rawUser1.email,
            password: rawUser1.password,
            twoFaCode: pinCode
          },
          requestInfo
        )
        expect(stubNotificationLogin.args[0][0].id).to.eq(user.id)
        expect(stubNotificationLogin.args[0][1]).to.eq(requestInfo)

        expect(user.id).to.eq(user.id)
        expect(token.length).to.eq(207)
        expect(stubNotificationAccountBlocked.calledOnce).to.be.false
      })

      it('Should login demo account', async () => {
        config.DEMO_ACCOUNT = demoUser.email

        const { user, token } = await UserController.login(
          {
            email: demoUser.email,
            password: rawDemoUser.password,
            twoFaCode: 'any-2fa'
          },
          requestInfo
        )

        expect(user.id).to.eq(demoUser.id)
        expect(token.length).to.eq(207)
      })

      it('Should throw error if fake account password wrong', async () => {
        config.DEMO_ACCOUNT = demoUser.email

        await expect(
          UserController.login(
            {
              email: 'fake email',
              password: 'any-pwd',
              twoFaCode: 'any-2fa'
            },
            requestInfo
          )
        ).rejectedWith(Error, 'bad_credentials')
      })

      it('Should login with 2fa', async () => {
        const { token } = await Models.Token.createFor2Fa(user1, requestInfo)
        await user1.update({ twoFactor: true })
        const twoFaCode = speakeasy.totp({
          secret: cryptoHelper.decrypt(token!.value, config.CIPHER_2FA),
          encoding: 'base32'
        })

        const { user } = await UserController.login(
          {
            email: rawUser1.email,
            password: rawUser1.password,
            twoFaCode
          },
          requestInfo
        )
        expect(stubNotificationLogin.args[0][0].id).to.eq(user.id)
        expect(stubNotificationLogin.args[0][1]).to.eq(requestInfo)

        expect(user.email).to.eq(rawUser1.email)
      })

      it('Cannot login without 2fa', async () => {
        const requestInfo = { ip: '1.1.1.1' }

        await expect(
          UserController.login(
            {
              email: rawUser1.email,
              password: rawUser1.password,
              twoFaCode: ''
            },
            requestInfo
          )
        ).to.be.rejectedWith(Error, 'two_factor_code_required')
      })

      it('Should login with ip', async () => {
        const requestInfo = { ip: '1.1.1.1' }
        const { user } = await UserController.login(
          {
            email: rawUser1.email,
            password: rawUser1.password,
            twoFaCode: pinCode
          },
          requestInfo
        )
        expect(user.email).to.eq(rawUser1.email)

        expect(stubNotificationLogin.calledOnce).to.be.true
        expect(stubNotificationLogin.args[0][0].id).to.eq(user.id)
        expect(stubNotificationLogin.args[0][1]).to.eq(requestInfo)
      })

      it('Cannot login if user not found', () => {
        return expect(
          UserController.login(
            {
              email: 'not-exist-email',
              password: rawUser1.password,
              twoFaCode: token2faEmail.value
            },
            requestInfo
          )
        ).be.rejectedWith(Error, 'bad_credentials')
      })

      it('Cannot login is incorrect password', async () => {
        const isActive = user1.isActive
        await expect(
          UserController.login(
            {
              email: rawUser1.email,
              password: 'incorrect pass',
              twoFaCode: token2faEmail.value
            },
            requestInfo
          )
        ).be.rejectedWith(Error, 'bad_credentials')
        await user1.reload()
        expect(user1.countLoginFailed).to.be.eq(1)
        expect(user1.isActive).to.be.eq(isActive)
      })

      it('Cannot login is incorrect password and set the user to be inactive after 10 login attempts', async () => {
        await user1.update({
          countLoginFailed: 9
        })

        await expect(
          UserController.login(
            {
              email: rawUser1.email,
              password: 'incorrect pass',
              twoFaCode: token2faEmail.value
            },
            requestInfo
          )
        ).be.rejectedWith(Error, 'bad_credentials')
        await user1.reload()
        expect(user1.countLoginFailed).to.be.eq(10)
        expect(user1.isActive).to.be.eq(false)
        const user = await Models.User.findByEmail(user1.email)
        expect(stubNotificationAccountBlocked.calledWith(user!.filterKeys())).to.be.true
      })

      it('Cannot login is incorrect 2fa code and set the user to be inactive after 10 login attempts', async () => {
        await user1.update({
          countLoginFailed: 9
        })

        await expect(
          UserController.login(
            {
              email: rawUser1.email,
              password: rawUser1.password,
              twoFaCode: '1111'
            },
            requestInfo
          )
        ).be.rejectedWith(Error, 'two_factor_code_invalid')
        await user1.reload()
        expect(user1.countLoginFailed).to.be.eq(10)
        expect(user1.isActive).to.be.eq(false)
        const user = await Models.User.findByEmail(user1.email)
        expect(stubNotificationAccountBlocked.calledWith(user!.filterKeys())).to.be.true
      })

      it('should reset countLoginFailed', async () => {
        await user1.update({
          countLoginFailed: 9
        })

        await UserController.login(
          {
            email: rawUser1.email,
            password: rawUser1.password,
            twoFaCode: pinCode
          },
          { ip: '192.0.0.1' }
        )
        await user1.reload()
        expect(user1.countLoginFailed).to.be.eq(0)
      })

      it('Cannot login is incorrect two factor token', async () => {
        await Models.Token.createFor2Fa(user1, requestInfo)
        await user1.update({ twoFactor: true })

        return await expect(
          UserController.login(
            {
              email: rawUser1.email,
              password: rawUser1.password,
              twoFaCode: 'pouet'
            },
            requestInfo
          )
        ).be.rejectedWith(Error, 'two_factor_code_invalid')
      })

      it('Cannot login is missing two factor token', async () => {
        const requestInfo = { ip: '1.1.1.1', countryCode: 'countryCode' }

        await Models.Token.createFor2Fa(user1, requestInfo)
        await user1.update({ twoFactor: true })

        return await expect(
          UserController.login(
            {
              email: rawUser1.email,
              password: rawUser1.password,
              twoFaCode: ''
            },
            requestInfo
          )
        ).be.rejectedWith(Error, 'two_factor_code_required')
      })

      it('Cannot login if user not active', async () => {
        const rawUser = {
          firstName: 'firstName11',
          lastName: 'lastName11',
          email: '11@email.com',
          password: 'pass11',
          isActive: false
        }

        const user = await Models.User.create(rawUser)
        const { token } = await Models.Token.createFor2FAEmail(user, requestInfo)

        await expect(
          UserController.login(
            {
              email: rawUser.email,
              password: rawUser.password,
              twoFaCode: token.value
            },
            requestInfo
          )
        ).be.rejectedWith(Error, 'bad_credentials')
      })

      it('Should login and verify', async () => {
        const rawUser = {
          firstName: 'firstName11',
          lastName: 'lastName11',
          email: '11@email.com',
          password: 'pass11',
          isActive: true,
          verifyEmail: false
        }

        const userCreate = await Models.User.create({ ...rawUser })
        await Models.Token.createFor2FAEmail(userCreate, requestInfo)

        const { user, token } = await UserController.login(
          {
            email: rawUser.email,
            password: rawUser.password,
            twoFaCode: pinCode
          },
          requestInfo
        )

        expect(user.id).to.eq(userCreate.id)
        expect(token.length).to.eq(207)
        await userCreate.reload()
        expect(userCreate.verifyEmail).to.be.true
        expect(stubNotificationValidateEmail.args[0][0].id).to.eq(userCreate.id)
      })
    })

    it('Should logout', async () => {
      const token = await Models.Token.create({
        value: 'auth-token',
        type: IEnumTokenType.AUTH,
        UserId: user1.id,
        clientIp: '192.0.0.1'
      } as ITokenAttribute)

      const res = await UserController.logout(user1, token)
      const tokens = await user1.getTokensByType(IEnumTokenType.AUTH)

      expect(res).to.be.true
      expect(tokens.length).to.eq(0)
    })

    describe('askResetPassword', () => {
      it('Should send reset password mail', async () => {
        const token: any = {
          token: 'tokenId'
        }
        const createForResetPassword = sandbox.stub(Models.Token, 'createForResetPassword').resolves(token)

        const res = await UserController.askResetPassword(user1.email, requestInfo)
        await user1.reload()
        expect(res).to.eq(true)
        expect(createForResetPassword.args[0][0].id).to.eq(user1.id)
        expect(stubNotificationAskResetPassword.args[0][0].id).to.eq(user1.id)
        expect(stubNotificationAskResetPassword.args[0][1]).to.eq(token.value)
        expect(user1.countLoginFailed).to.eq(1)
      })

      it('Cannot ask reset password if email invalid and set the user to inactive if countLoginFailed >= 10 attempts', async () => {
        await user1.update({
          countLoginFailed: 9
        })
        await UserController.askResetPassword(user1.email, requestInfo)

        await user1.reload()
        expect(user1.countLoginFailed).to.eq(10)
        expect(user1.isActive).to.eq(false)
        expect(stubNotificationAskResetPassword.calledOnce).to.be.false
        const user = await Models.User.findByEmail(user1.email)
        expect(stubNotificationAccountBlocked.calledWith(user!.filterKeys())).to.be.true
      })

      it('Should send reset password mail if not verify', async () => {
        const token: any = {
          token: 'tokenId'
        }
        await user1.update({ verifyEmail: false })

        const createForResetPassword = sandbox.stub(Models.Token, 'createForResetPassword').resolves(token)

        const res = await UserController.askResetPassword(user1.email, requestInfo)

        expect(res).to.eq(true)
        expect(createForResetPassword.args[0][0].id).to.eq(user1.id)
        expect(stubNotificationAskResetPassword.args[0][0].id).to.eq(user1.id)
        expect(stubNotificationAskResetPassword.args[0][1]).to.eq(token.value)
      })

      it('Should return true if user not exist', async () => {
        expect(await UserController.askResetPassword('invalid@email.com', requestInfo)).to.be.true
      })

      it('Should ask reset password mail if user not active or verify email', async () => {
        const createForResetPassword = sandbox.stub(Models.Token, 'createForResetPassword').resolves()

        await user1.update({ isActive: false })
        expect(await UserController.askResetPassword(user1.email, requestInfo)).to.be.true
        expect(createForResetPassword.callCount).to.be.eq(0)
      })
    })

    describe('askChangeEmail', () => {
      it('Should ask change email', async () => {
        const token: any = {
          token: 'tokenId'
        }
        const createForChangeEmail: sinon.SinonStub = sandbox.stub(Models.Token, 'createForChangeEmail').resolves(token)
        const stubNotAskChangeEmail: sinon.SinonStub = sandbox.stub(Notification, 'askChangeEmail').resolves(token)

        const res = await UserController.askChangeEmail(user1, rawUser1.password, 'test1@me.com', { ip: '127.0.0.1' })
        await user1.reload()
        expect(res).to.eq(true)
        expect(createForChangeEmail.args[0][0].id).to.eq(user1.id)
        expect(stubNotAskChangeEmail.calledOnce).to.be.true
        expect(stubNotAskChangeEmail.calledWith(user1.filterKeys(), 'test1@me.com', token.value)).to.be.true
      })

      it('Cannot change email if already exists', () => {
        return expect(UserController.askChangeEmail(user1, rawUser1.password, rawUser1.email, { ip: '127.0.0.1' })).be.rejectedWith(
          Error,
          'already_exists'
        )
      })

      it('Cannot change email if wrong password', () => {
        return expect(UserController.askChangeEmail(user1, 'xxx', 'demo@example.com', { ip: '127.0.0.1' })).be.rejectedWith(
          Error,
          'bad_credentials'
        )
      })
    })

    describe('Reset password', () => {
      it('Should reset password', async () => {
        const stubRemoveTokensByType = sandbox.stub(Models.User.prototype, 'removeTokensByType').resolves('ok')

        await UserController.askResetPassword(user1.email, requestInfo)
        const token = stubNotificationAskResetPassword.args[0][1]
        expect(stubRemoveTokensByType.callCount).to.be.eq(1)

        const newPassword = 'ifijfeizjfze'

        const res = await UserController.resetPassword({ token, newPassword })
        expect(res).to.eq(true)

        const tokenDb = await Models.Token.findByTypeAndValueWithUser(token, IEnumTokenType.RESET_PASSWORD)
        expect(tokenDb).not.to.exist

        expect(stubRemoveTokensByType.callCount).to.be.eq(5)
        expect(stubRemoveTokensByType.calledWith(IEnumTokenType.RESET_PASSWORD)).to.be.true
        expect(stubRemoveTokensByType.calledWith(IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN)).to.be.true
        expect(stubRemoveTokensByType.calledWith(IEnumTokenType.CHANGE_EMAIL)).to.be.true
        expect(stubRemoveTokensByType.calledWith(IEnumTokenType.AUTH)).to.be.true
        expect(stubNotificationPasswordChanged.calledOnce).to.be.true
        expect(stubNotificationPasswordChanged.args[0][0].id).to.eq(user1.id)

        const { user } = await UserController.login(
          {
            email: user1.email,
            password: newPassword,
            twoFaCode: pinCode
          },
          requestInfo
        )
        expect(user.email).to.eq(user.email)
      })

      it('Should not reset password for wrong token', async () => {
        await Models.Token.create({
          value: 'fiefiojsd',
          type: IEnumTokenType.RESET_PASSWORD,
          UserId: user1.id
        } as ITokenAttribute)

        const token = 'fqdsgdsqg'
        const newPassword = 'ifijfeizjfze'
        await expect(UserController.resetPassword({ token, newPassword })).to.be.rejectedWith(Error, 'invalid_token')
      })

      it('Should not reset password with same password', async () => {
        const tokenDb = await Models.Token.create({
          value: 'fiefiojsd',
          type: IEnumTokenType.RESET_PASSWORD,
          UserId: user1.id
        } as ITokenAttribute)

        await expect(UserController.resetPassword({ token: tokenDb.value, newPassword: rawUser1.password })).to.be.rejectedWith(
          Error,
          'password_should_be_different'
        )
      })

      it('Should not reset password for expired token', async () => {
        const oldConfigResetPasswordExpired = config.SERVICES.API_USER.MAIL_RESET_PASSWORD_EXPIRATION
        config.SERVICES.API_USER.MAIL_RESET_PASSWORD_EXPIRATION = 0

        const tokendb = await Models.Token.create({
          value: 'fiefiojsd',
          type: IEnumTokenType.RESET_PASSWORD,
          UserId: user1.id
        } as ITokenAttribute)
        await expect(UserController.resetPassword({ token: tokendb.value, newPassword: 'ifijfeizjfze' })).to.be.rejectedWith(
          Error,
          'token_expired'
        )

        config.SERVICES.API_USER.MAIL_RESET_PASSWORD_EXPIRATION = oldConfigResetPasswordExpired
      })
    })

    describe('Change password', () => {
      it('Cannot change password if old password incorrect', () => {
        return expect(
          UserController.changePassword(user1, {
            oldPassword: 'wrong password',
            newPassword: 'newPassword'
          })
        ).be.rejectedWith(Error, 'bad_credentials')
      })

      it('Cannot change password if old password and new are same', async () => {
        await expect(
          UserController.changePassword(user1, {
            oldPassword: rawUser1.password,
            newPassword: rawUser1.password
          })
        ).to.be.rejectedWith(Error, 'password_should_be_different')
      })

      it('Should change password', async () => {
        const stubRemoveTokensByType = sandbox.stub(Models.User.prototype, 'removeTokensByType').resolves('ok')

        const newPassword = 'newPassword'

        const res = await UserController.changePassword(user1, {
          oldPassword: rawUser1.password,
          newPassword
        })

        expect(res).to.eq(true)
        expect(stubRemoveTokensByType.callCount).to.be.eq(4)
        expect(stubRemoveTokensByType.calledWith(IEnumTokenType.RESET_PASSWORD)).to.be.true
        expect(stubRemoveTokensByType.calledWith(IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN)).to.be.true
        expect(stubRemoveTokensByType.calledWith(IEnumTokenType.CHANGE_EMAIL)).to.be.true
        expect(stubRemoveTokensByType.calledWith(IEnumTokenType.AUTH)).to.be.true
        expect(stubNotificationPasswordChanged.calledOnce).to.be.true
        expect(stubNotificationPasswordChanged.calledWith(user1.filterKeys())).to.be.true

        const { user } = await UserController.login(
          {
            email: rawUser1.email,
            password: newPassword,
            twoFaCode: pinCode
          },
          requestInfo
        )

        expect(user.email).to.eq(rawUser1.email)
      })
    })

    describe('Two factor', () => {
      it('Should ask for twoFactor', async () => {
        const res = await UserController.askTwoFactor(user1, requestInfo)

        const twoFaTokens = await user1.getTokensByType(IEnumTokenType.TWO_FACTOR_LOGIN)
        const twoFaToken = twoFaTokens[0]
        const decryptedTokenValue = cryptoHelper.decrypt(twoFaToken.value, config.CIPHER_2FA)

        expect(res.qrData).to.eq(`otpauth://totp/default@email.com?secret=${decryptedTokenValue}&issuer=AgreeWe`)
        expect(res.secret).to.eq(decryptedTokenValue)

        await user1.reload()
        expect(user1.twoFactor).to.be.false
      })

      it('Should not ask if already enabled', async () => {
        await user1.update({ twoFactor: true })
        await expect(UserController.askTwoFactor(user1, requestInfo)).to.be.rejectedWith(Error, 'two_factor_already_enable')
      })

      it('Should enable twoFactor', async () => {
        const res = await UserController.askTwoFactor(user1, requestInfo)
        const stubRemoveTokensByType = sandbox.stub(Models.User.prototype, 'removeTokensByType').resolves('ok')

        const twoFaCode = speakeasy.totp({
          secret: res.secret,
          encoding: 'base32'
        })

        await UserController.enableTwoFactor(user1, twoFaCode, {})

        await user1.reload()
        expect(user1.twoFactor).to.be.true
        expect(stubRemoveTokensByType.callCount).to.be.eq(4)
        expect(stubRemoveTokensByType.calledWith(IEnumTokenType.RESET_PASSWORD)).to.be.true
        expect(stubRemoveTokensByType.calledWith(IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN)).to.be.true
        expect(stubRemoveTokensByType.calledWith(IEnumTokenType.CHANGE_EMAIL)).to.be.true
        expect(stubRemoveTokensByType.calledWith(IEnumTokenType.AUTH)).to.be.true
      })

      it('Should not enable with wrong token', async () => {
        await UserController.askTwoFactor(user1, requestInfo)

        await expect(UserController.enableTwoFactor(user1, 'ojfoekf', {})).to.be.rejectedWith(Error, 'two_factor_code_invalid')

        await user1.reload()
        expect(user1.twoFactor).to.be.false
      })

      it('Should not enable if already enabled', async () => {
        await user1.update({ twoFactor: true })
        await expect(UserController.enableTwoFactor(user1, '', {})).to.be.rejectedWith(Error, 'two_factor_already_enable')
      })

      it('Should not enable if not asked', async () => {
        await expect(UserController.enableTwoFactor(user1, 'ijfiezj', {})).to.be.rejectedWith(Error, 'two_factor_token_required')
      })

      it('Should disable twoFactor', async () => {
        const res = await UserController.askTwoFactor(user1, requestInfo)

        const twoFaCode = speakeasy.totp({
          secret: res.secret,
          encoding: 'base32'
        })

        await UserController.enableTwoFactor(user1, twoFaCode, {})

        const spyRemoveTokensByType = sandbox.spy(Models.User.prototype, 'removeTokensByType')

        await UserController.disableTwoFactor(user1, twoFaCode, requestInfo)

        await user1.reload()
        expect(user1.twoFactor).to.be.false

        const twoFaTokens = await user1.getTokensByType(IEnumTokenType.TWO_FACTOR_LOGIN)
        expect(twoFaTokens.length).to.eq(0)
        expect(spyRemoveTokensByType.callCount).to.be.eq(4)
        expect(spyRemoveTokensByType.calledWith(IEnumTokenType.TWO_FACTOR_LOGIN)).to.be.true
        expect(spyRemoveTokensByType.calledWith(IEnumTokenType.RESET_PASSWORD)).to.be.true
        expect(spyRemoveTokensByType.calledWith(IEnumTokenType.CHANGE_EMAIL)).to.be.true
        expect(spyRemoveTokensByType.calledWith(IEnumTokenType.AUTH)).to.be.true
        expect(stubNotificationTwoFaDisabled.calledWith(user1.filterKeys(), requestInfo)).to.be.true
      })

      it('Should not disable if not wrong code', async () => {
        const stubCheckFailedLoginAttempts = sandbox.stub(UserController, '_checkFailedLoginAttempts')
        await UserController.askTwoFactor(user1, requestInfo)
        await user1.update({ twoFactor: true })

        await expect(UserController.disableTwoFactor(user1, 'ojfoekf', {})).to.be.rejectedWith(Error, 'two_factor_code_invalid')

        await user1.reload()
        expect(user1.twoFactor).to.be.true
        const twoFaTokens = await user1.getTokensByType(IEnumTokenType.TWO_FACTOR_LOGIN)
        expect(twoFaTokens.length).to.eq(1)
        expect(stubNotificationTwoFaDisabled.calledOnce).to.be.false
        expect(stubCheckFailedLoginAttempts.calledOnce).to.be.true
        expect(stubCheckFailedLoginAttempts.args[0][0].id).to.be.eq(user1.id)
      })
    })
  })

  describe('_checkFailedLoginAttempts', () => {
    it('should set user active false and create new user activity', async () => {
      const user = await Models.User.create({
        firstName: 'firstName2',
        lastName: 'lastName2',
        email: 'alfredo@email.test.com',
        password: rawUser1.password,
        isActive: true,
        verifyEmail: true,
        countLoginFailed: 9
      })
      const res = await UserController._checkFailedLoginAttempts(user)
      expect(res).to.be.true
      expect(user.isActive).to.be.false
      expect(user.countLoginFailed).to.be.eq(10)
      expect(stubNotificationAccountBlocked.calledWith(user.filterKeys())).to.be.true
    })

    it('should not set user to in active and not create new user activity', async () => {
      const user = await Models.User.create({
        firstName: 'firstName2',
        lastName: 'lastName2',
        email: 'alfredo@email.test.com',
        password: rawUser1.password,
        isActive: true,
        verifyEmail: true
      })
      const res = await UserController._checkFailedLoginAttempts(user)
      expect(res).to.be.true
      expect(user.isActive).to.be.true
      expect(user.countLoginFailed).to.be.eq(1)
      expect(stubNotificationAccountBlocked.called).to.be.false
    })

    it('Throw error when user is already disabled and make too many attempts', async () => {
      const user = await Models.User.create({
        firstName: 'firstName2',
        lastName: 'lastName2',
        email: 'alfredo@email.test.com',
        password: rawUser1.password,
        isActive: false,
        verifyEmail: true,
        countLoginFailed: 20
      })
      await expect(UserController._checkFailedLoginAttempts(user)).to.be.rejectedWith(Error, 'disabled_account')
      expect(user.isActive).to.be.false
      expect(user.countLoginFailed).to.be.eq(20)
    })
  })
})
