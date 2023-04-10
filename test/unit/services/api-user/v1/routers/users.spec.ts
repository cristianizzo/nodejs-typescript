import * as path from 'path'
import * as sinon from 'sinon'
import * as Router from '@koa/router'
import { expect } from 'chai'
import UsersRouter from '@api-user/v1/routers/users'
import UsersController from '@api-user/v1/controllers/user'
import AuthMiddleware from '@api-user/v1/middlewares/auth'
import postgres from '@modules/postgres'
import Crypto from '@helpers/crypto'
import { sequelizeMockingMocha } from 'sequelize-mocking'
import Models from '@postgresModels'
import { IUserAttribute } from '@type/db/db'

describe('Router: Users', () => {
  let sandbox: any = null
  let getReq = null
  let postReq = null
  let putReq = null
  let deleteReq = null
  let user

  sequelizeMockingMocha(postgres.sequelize, [path.resolve('test/mocks/userRole.json'), path.resolve('test/mocks/users.json')], {
    logging: false
  })

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    getReq = sandbox.stub(Router.prototype, 'get')
    postReq = sandbox.stub(Router.prototype, 'post')
    deleteReq = sandbox.stub(Router.prototype, 'delete')
    putReq = sandbox.stub(Router.prototype, 'put')

    user = await Models.User.findByPk('26a05507-0395-447a-bbbb-000000000000')
  })

  afterEach(async () => {
    sandbox?.restore()
  })

  it('Should get router', async () => {
    const authed = (ctx, next) => next()
    const authAssert = sandbox.stub(AuthMiddleware, 'authAssert').callsFake((params) => {
      if (params.isActive && params.verifyEmail) {
        return authed
      }
    })
    const router: any = await UsersRouter.router()

    expect(authAssert.calledWith({ isActive: true, verifyEmail: true })).to.be.true
    expect(router instanceof Router).to.be.true
    expect(router.post.calledWith('/create', UsersRouter.createUser)).to.be.true
    expect(router.post.calledWith('/ask-login', UsersRouter.askLogin)).to.be.true
    expect(router.post.calledWith('/login', UsersRouter.login)).to.be.true
    expect(router.post.calledWith('/ask-reset-password', UsersRouter.askResetPassword)).to.be.true
    expect(router.post.calledWith('/reset-password', UsersRouter.resetPassword)).to.be.true
    expect(router.post.calledWith('/change-email', UsersRouter.changeEmail)).to.be.true

    expect(router.get.calledWith('/me', authed, UsersRouter.getUser)).to.be.true
    expect(router.put.calledWith('/update', authed, UsersRouter.updateUser)).to.be.true
    expect(router.get.calledWith('/logout', authed, UsersRouter.logout)).to.be.true
    expect(router.post.calledWith('/change-password', authed, UsersRouter.changePassword)).to.be.true
    expect(router.post.calledWith('/ask-change-email', authed, UsersRouter.askChangeEmail)).to.be.true
    expect(router.get.calledWith('/ask-two-factor', authed, UsersRouter.askTwoFactor)).to.be.true
    expect(router.post.calledWith('/enable-two-factor', authed, UsersRouter.enableTwoFactor)).to.be.true
    expect(router.post.calledWith('/disable-two-factor', authed, UsersRouter.disableTwoFactor)).to.be.true
  })

  describe('createUser', () => {
    it('Should createUser', async () => {
      const user = {
        email: 'fizej@ifjz.com',
        filterKeys: sandbox.stub().returns('filterKeys')
      }
      const token = 'fdfgsm'

      const stubCreate: sinon.SinonStub = sandbox.stub(UsersController, 'createUser').resolves({ token })
      const password = Crypto.sha.hash('NothingIsRandom')
      const rawUser = {
        firstName: 'fezoijf',
        lastName: 'fezoijf',
        email: user.email,
        password,
        termsVersion: '1.1'
      }

      const ctx: any = {
        request: {
          body: rawUser
        },
        requestInfo: { ip: '12' }
      }

      await UsersRouter.createUser(ctx)

      expect(ctx.body).to.deep.eq({ token })
      expect(stubCreate.calledOnce).to.be.true
      expect(stubCreate.args[0][0]).to.be.deep.eq({
        firstName: rawUser.firstName,
        lastName: rawUser.lastName,
        email: rawUser.email,
        password: rawUser.password,
        termsVersion: '1.1'
      })
      expect(stubCreate.args[0][1]).to.be.deep.eq(ctx.requestInfo)
    })

    it('Should createUser with optional', async () => {
      const user = {
        email: 'fizej@ifjz.com',
        filterKeys: sandbox.stub().returns('filterKeys')
      }
      const token = 'fdfgsm'

      const stubCreate: sinon.SinonStub = sandbox.stub(UsersController, 'createUser').resolves({ token })

      const password = Crypto.sha.hash('NothingIsRandom')
      const rawUser = {
        firstName: 'fezoijf ',
        lastName: 'fezoijf ',
        email: user.email,
        password,
        termsVersion: '1.1'
      }

      const ctx: any = {
        request: {
          body: rawUser
        },
        requestInfo: { ip: '12' }
      }

      await UsersRouter.createUser(ctx)

      expect(ctx.body).to.deep.eq({ token })
      expect(stubCreate.args[0][0]).to.be.deep.eq({
        firstName: 'fezoijf',
        lastName: 'fezoijf',
        email: rawUser.email,
        password: rawUser.password,
        termsVersion: '1.1'
      })
      expect(stubCreate.args[0][1]).to.be.deep.eq(ctx.requestInfo)
    })

    it('Should createUser: invalid', async () => {
      const s: sinon.SinonStub = sandbox.stub(UsersController, 'createUser').resolves('data')
      const generateLogin: sinon.SinonStub = sandbox.stub(AuthMiddleware, 'generateLogin')

      const password = Crypto.sha.hash('NothingIsRandom')

      function modifiedCtx(key, value) {
        const rawUser = {
          firstName: 'fezoijf',
          lastName: 'fezoijf',
          email: 'fezoijf@ife.com',
          password,
          termsVersion: '1.1'
        }

        return {
          request: {
            body: Object.assign({}, rawUser, {
              [key]: value
            })
          },
          requestInfo: { ip: '12' }
        }
      }

      const ctxs: any = [
        modifiedCtx('firstName', 'a'),
        modifiedCtx('lastName', null),
        modifiedCtx('email', null),
        modifiedCtx('email', 'ffds'),
        modifiedCtx('password', null),
        modifiedCtx('password', 'aaaaa'),
        modifiedCtx('password', '0f07830a403f530d3981e4719be64484bd05dd57b2a0b780e3de34069edd5c2'),
        modifiedCtx('password', '0f07830a403f530d3981e4719be64484bd05dd57b2a0b780e3de34069edd5c211'),
        modifiedCtx('termsVersion', null)
      ]

      expect(s.calledOnce).to.be.false
      expect(generateLogin.calledOnce).to.be.false
      await Promise.all(ctxs.map((ctx) => expect(UsersRouter.createUser(ctx)).to.be.rejectedWith(Error, 'bad_params')))
    })
  })

  it('Should ask login', async () => {
    const stubAskLogin: sinon.SinonStub = sandbox.stub(UsersController, 'askLogin').resolves(true)

    const password = Crypto.sha.hash('NothingIsRandom')
    const ctx: any = {
      request: {
        body: {
          email: 'email@github.com',
          password
        }
      },
      requestInfo: { ip: '12' }
    }

    await UsersRouter.askLogin(ctx)

    expect(ctx.body).to.be.true
    expect(
      stubAskLogin.calledWith(
        {
          email: ctx.request.body.email,
          password: ctx.request.body.password
        },
        ctx.requestInfo
      )
    ).to.be.true
  })

  describe('login', () => {
    it('Should login with email 2fa', async () => {
      const logged = { user: 'user', token: 'token' }
      const login = sandbox.stub(UsersController, 'login').resolves(logged)

      const password = Crypto.sha.hash('NothingIsRandom')
      const ctx: any = {
        request: {
          body: {
            email: 'email@fie1.com',
            password,
            twoFaCode: '123456'
          }
        },
        requestInfo: { ip: '12' }
      }

      await UsersRouter.login(ctx)

      expect(ctx.body).to.deep.eq(logged)
      expect(
        login.calledWith(
          {
            email: ctx.request.body.email,
            password: ctx.request.body.password,
            twoFaCode: '123456'
          },
          ctx.requestInfo
        )
      ).to.be.true
    })

    it('Should login with 2fa', async () => {
      const logged = { user: 'user', token: 'token' }
      const login = sandbox.stub(UsersController, 'login').resolves(logged)

      const password = Crypto.sha.hash('NothingIsRandom')
      const ctx: any = {
        request: {
          body: {
            email: 'email@fie2.com',
            password,
            twoFaCode: '121212'
          }
        },
        requestInfo: { ip: '12' }
      }

      await UsersRouter.login(ctx)

      expect(ctx.body).to.deep.eq(logged)
      expect(
        login.calledWith(
          {
            email: ctx.request.body.email,
            password: ctx.request.body.password,
            twoFaCode: ctx.request.body.twoFaCode
          },
          ctx.requestInfo
        )
      ).to.be.true
    })

    it('Should login with captcha', async () => {
      const logged = { user: 'user', token: 'token' }
      const login = sandbox.stub(UsersController, 'login').resolves(logged)

      const password = Crypto.sha.hash('NothingIsRandom')
      const ctx: any = {
        request: {
          body: {
            email: 'email@fie3.com',
            password,
            twoFaCode: '123456',
            'g-recaptcha-response': 'fizjefoiejz'
          }
        },
        requestInfo: { ip: '12' }
      }

      await UsersRouter.login(ctx)

      expect(ctx.body).to.deep.eq(logged)

      expect(
        login.calledWith(
          {
            email: ctx.request.body.email,
            password: ctx.request.body.password,
            twoFaCode: '123456'
          },
          ctx.requestInfo
        )
      ).to.be.true
    })

    it('Should login: invalid', async () => {
      const s = sandbox.stub(UsersController, 'login').resolves('data')

      function modifiedCtx(key, value) {
        const rawQuery = {
          email: 'emailfqs@fe.com',
          password: 'password',
          twoFaCode: 'twoFaCode'
        }

        return {
          request: {
            body: Object.assign({}, rawQuery, {
              [key]: value
            })
          }
        }
      }

      const ctxs: any = [
        modifiedCtx('email', null),
        modifiedCtx('email', 'ffds'),
        modifiedCtx('password', null),
        modifiedCtx('password', 'aaaaa')
      ]

      expect(s.calledOnce).to.be.false
      await Promise.all(ctxs.map((ctx) => expect(UsersRouter.login(ctx)).to.be.rejectedWith(Error, 'bad_params')))
    })
  })

  it('Should ask reset password', async () => {
    const sendMailResetPassword: sinon.SinonStub = sandbox.stub(UsersController, 'askResetPassword').resolves()

    const ctx: any = {
      request: {
        body: {
          email: user.email
        }
      }
    }

    await UsersRouter.askResetPassword(ctx)

    expect(ctx.body).to.be.true
    expect(sendMailResetPassword.args[0][0]).to.eq(user.email)
  })

  it('Should resetPassword', async () => {
    const resetPassword: sinon.SinonStub = sandbox.stub(UsersController, 'resetPassword').resolves()

    const password = Crypto.sha.hash('NothingIsRandom')

    const params = {
      token: 'GJKCKOBTHFUTO6DVKBEDIV26IV2VIKSJ',
      newPassword: password
    }

    const ctx: any = {
      request: {
        body: params
      }
    }

    await UsersRouter.resetPassword(ctx)

    expect(ctx.body).to.be.true
    expect(resetPassword.calledWith(params)).to.be.true
  })

  it('Should change email', async () => {
    const changeEmail = sandbox.stub(UsersController, 'changeEmail').resolves()

    const ctx: any = {
      request: {
        body: {
          token: 'GJKCKOBTHFUTO6DVKBEDIV26IV2VIKSJ'
        }
      }
    }

    await UsersRouter.changeEmail(ctx)

    expect(ctx.body).to.be.true
    expect(changeEmail.args[0][0]).to.eq('GJKCKOBTHFUTO6DVKBEDIV26IV2VIKSJ')
  })

  it('Should ask change email', async () => {
    const stubCtrl: sinon.SinonStub = sandbox.stub(UsersController, 'askChangeEmail').resolves(true)

    const ctx: any = {
      state: {
        user
      },
      requestInfo: { ip: '12' },
      request: {
        body: {
          newEmail: 'test@example.com',
          password: user.password
        }
      }
    }

    await UsersRouter.askChangeEmail(ctx)

    expect(ctx.body).to.be.true
    expect(stubCtrl.args[0][0].id).to.eq(user.id)
    expect(stubCtrl.args[0][1]).to.eq(user.password)
    expect(stubCtrl.args[0][2]).to.eq('test@example.com')
    expect(stubCtrl.args[0][3].ip).to.eq('12')
  })

  it('Should get user', async () => {
    const ctx: any = {
      state: {
        user
      }
    }

    await UsersRouter.getUser(ctx)

    expect(ctx.body.id).to.eq(user.id)
    expect(ctx.body.save).not.to.exist
  })

  it('Should updateUser', async () => {
    const update = sandbox.stub(UsersController, 'update').resolves()

    const user = await Models.User.create({
      firstName: 'firstName1',
      lastName: 'lastName1',
      email: '1fqsdfqs@email.com',
      password: 'pass1',
      termsVersion: '1.1'
    } as IUserAttribute)

    const params = {
      firstName: 'firstNameChanged',
      lastName: 'lastNameChanged'
    }

    const ctx: any = {
      state: {
        user
      },
      request: {
        body: params
      }
    }

    await UsersRouter.updateUser(ctx)

    expect(
      update.calledWith(user, {
        firstName: 'firstNameChanged',
        lastName: 'lastNameChanged'
      })
    ).to.be.true
  })

  it('Should updateUser with all optional', async () => {
    const update = sandbox.stub(UsersController, 'update').resolves()

    const user = await Models.User.create({
      firstName: 'firstName1',
      lastName: 'lastName1',
      email: '1fqsdfqs@email.com',
      password: 'pass1',
      termsVersion: '1.2'
    } as IUserAttribute)

    const params = {
      firstName: 'firstNameChanged',
      lastName: 'lastNameChanged',
      termsVersion: '1.0.0'
    }

    const ctx: any = {
      state: {
        user
      },
      request: {
        body: params
      }
    }

    await UsersRouter.updateUser(ctx)
    expect(update.args[0][1].firstName).to.be.eq(params.firstName)
    expect(update.args[0][1].lastName).to.be.eq(params.lastName)
    expect(update.args[0][1].termsVersion).to.be.eq(params.termsVersion)
  })

  it('Should changePassword', async () => {
    const getAll = sandbox.stub(UsersController, 'changePassword').resolves()

    const password = Crypto.sha.hash('NothingIsRandom')
    const password2 = Crypto.sha.hash('RandomIsNothing')
    const ctx: any = {
      state: {
        user
      },
      request: {
        body: {
          oldPassword: password,
          newPassword: password2
        }
      }
    }

    await UsersRouter.changePassword(ctx)

    expect(ctx.body).to.be.true
    expect(getAll.args[0][0].id).to.eq(user.id)
    expect(getAll.args[0][1]).to.deep.eq({
      oldPassword: password,
      newPassword: password2
    })
  })

  it('Should askTwoFactor', async () => {
    const askTwoFactor = sandbox.stub(UsersController, 'askTwoFactor').resolves('d')

    const ctx: any = {
      state: {
        user
      }
    }

    await UsersRouter.askTwoFactor(ctx)

    expect(ctx.body).to.eq('d')
    expect(askTwoFactor.calledWith(user)).to.be.true
  })

  it('Should enableTwoFactor', async () => {
    const askTwoFactor = sandbox.stub(UsersController, 'enableTwoFactor').resolves('d')

    const ctx: any = {
      request: {
        body: {
          twoFaCode: '123456'
        }
      },
      state: {
        user
      },
      requestInfo: 'requestInfo1'
    }

    await UsersRouter.enableTwoFactor(ctx)
    expect(ctx.body).to.be.true
    expect(askTwoFactor.calledWith(user, ctx.request.body.twoFaCode, 'requestInfo1')).to.be.true
  })

  it('Should disableTwoFactor', async () => {
    const disableTwoFactor = sandbox.stub(UsersController, 'disableTwoFactor').resolves('d')
    const requestInfo = {
      ip: '12.12.12'
    }

    const ctx: any = {
      request: {
        body: {
          twoFaCode: '123456'
        }
      },
      state: {
        user
      },
      requestInfo
    }

    await UsersRouter.disableTwoFactor(ctx)

    expect(ctx.body).to.be.true

    expect(disableTwoFactor.calledWith(user, ctx.request.body.twoFaCode, requestInfo)).to.be.true
  })
})
