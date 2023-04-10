import * as path from 'path'
import * as sinon from 'sinon'
import * as moment from 'moment'
import { expect } from 'chai'
import { sequelizeMockingMocha } from 'sequelize-mocking'
import AuthMiddleware from '@api-user/v1/middlewares/auth'
import postgres from '@modules/postgres'
import Models from '@postgresModels'
import { IEnumTokenType, ITokenAttribute } from '@type/db/db'
import config from '@config'
import { decode, verify } from '@helpers/jwt'

describe('Middleware: Auth', () => {
  let sandbox: any = null
  let user: any
  let tokens: any
  let token: any
  let updatedRequestInfo: any

  sequelizeMockingMocha(postgres.sequelize, [path.resolve('test/mocks/users.json')], { logging: false })

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    user = await Models.User.findByPk('26a05507-0395-447a-bbbb-000000000000')
    tokens = await user.getTokens()
    token = await Models.Token.create({
      value: '22b22222-0395-447a-bbbb-000000000000',
      type: IEnumTokenType.AUTH,
      UserId: user.id,
      clientIp: '192.0.0.1',
      deviceId: 'deviceId'
    } as ITokenAttribute)
    updatedRequestInfo = {
      ip: 'ip',
      tokenId: token.id,
      userId: user.id
    }
  })

  afterEach(() => {
    sandbox && sandbox.restore()
  })

  it('Should generate jwt', () => {
    const tokenJwt = AuthMiddleware.generateJWT({ auth: 'xxx' })

    verify(tokenJwt, config.JWT_SECRET)

    expect(decode(tokenJwt, config.JWT_SECRET)!.auth).to.eq('xxx')
  })

  it('Should generate login jwt', async () => {
    const tokenJwt = AuthMiddleware.generateJWTLogin('token', 'user-agent')

    await verify(tokenJwt, config.JWT_SECRET)
    const decoded = decode(tokenJwt, config.JWT_SECRET)!

    expect(decoded.auth).to.eq('agreewe-user')
    expect(decoded.agent).to.eq('user-agent')
    expect(decoded.token).to.eq('token')
  })

  it('readJWT', async () => {
    const next = sandbox.stub()
    const ctx: any = {
      state: {},
      headers: {
        Authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoIjoiYW1vbi11c2VyIiwiYWdlbnQiOiIiLCJ1c2VySWQiOiIyNmEwNTUwNy0wMzk1LTQ0N2EtYmJiYi0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImpvbkBhbW9uLnRlY2giLCJpYXQiOjE1MTIzMzIyNzR9.rFyMFPhq42edZqLThIrOAI5kQiUO57LzwGBz3WA279w'
      }
    }
    await AuthMiddleware.readJWT()(ctx, next)

    expect(next.calledWith()).to.be.true
  })

  it('readJWT if not set', async () => {
    const next = sandbox.stub()
    const ctx: any = {
      state: {},
      headers: {}
    }
    await AuthMiddleware.readJWT()(ctx, next)

    expect(next.calledWith()).to.be.true
  })

  it('Should generate login', async () => {
    const tOpts = await postgres.transactionOptions()
    const updatedAt = new Date(Date.now())
    const stubCreateForLogin = sandbox.stub(Models.Token, 'createForLogin').resolves({
      value: 'value',
      updatedAt
    })
    const requestInfo = {
      ip: '1234',
      countryCode: 'EG'
    }
    const stubGenerateJWTLogin = sandbox.stub(AuthMiddleware, 'generateJWTLogin').resolves(true)

    const jwt = await AuthMiddleware.generateLogin(user, requestInfo, tOpts)

    expect(jwt).to.be.true
    expect(stubCreateForLogin.calledOnce).to.be.true
    expect(stubCreateForLogin.args[0][0]).to.be.eq(user.id)
    expect(stubGenerateJWTLogin.args[0][0]).to.be.eq('value')
    await tOpts.transaction.rollback()
  })

  it('authAssert', async () => {
    const next = sandbox.stub()
    const ctx: any = {
      state: {
        jwt: {
          token: token.value
        }
      },
      requestInfo: {
        deviceId: 'deviceId'
      }
    }
    await AuthMiddleware.authAssert()(ctx, next)

    expect(next.calledOnce).to.be.true
    expect(ctx.state.user.id).to.eq(user.id)
  })

  it('authAssert with token and user in state', async () => {
    const next = sandbox.stub()
    const ctx: any = {
      state: {
        jwt: {
          token: token.value
        },
        token,
        user
      },
      requestInfo: {
        ip: 'ip',
        deviceId: 'deviceId'
      }
    }

    await AuthMiddleware.authAssert()(ctx, next)

    expect(next.calledOnce).to.be.true
    expect(ctx.state.user.id).to.eq(user.id)
  })

  it('authAssert with isActive & verifyEmail', async () => {
    await user.update({ verifyEmail: true })
    await user.update({ isActive: true })

    const next = sandbox.stub()
    const ctx: any = {
      state: {
        jwt: {
          token: token.value
        }
      },
      requestInfo: {
        ip: 'ip',
        deviceId: 'deviceId'
      }
    }
    await AuthMiddleware.authAssert({ isActive: true, verifyEmail: true })(ctx, next)

    expect(next.calledOnce).to.be.true
    expect(ctx.state.user.id).to.eq(user.id)
  })

  it('authAssert with verify email', async () => {
    await user.update({ verifyEmail: true })
    await user.update({ active: false })

    const next = sandbox.stub()
    const ctx: any = {
      state: {
        jwt: {
          token: token.value
        }
      },
      requestInfo: {
        ip: 'ip',
        deviceId: 'deviceId'
      }
    }
    await AuthMiddleware.authAssert({ verifyEmail: true })(ctx, next)

    expect(next.calledOnce).to.be.true
    expect(ctx.state.user.id).to.eq(user.id)
  })

  it('authAssert with active', async () => {
    await user.update({ active: true })
    await user.update({ verifyEmail: false })

    const next = sandbox.stub()

    const ctx: any = {
      state: {
        jwt: {
          token: token.value
        }
      },
      requestInfo: {
        ip: 'ip',
        deviceId: 'deviceId'
      }
    }
    await AuthMiddleware.authAssert({ isActive: true })(ctx, next)

    expect(next.calledOnce).to.be.true
    expect(ctx.state.user.id).to.eq(user.id)
  })

  it('authAssert not get db twice', async () => {
    token.User = user

    const getUserFromToken = sandbox.stub(AuthMiddleware, 'getUserFromToken').resolves(token)
    const next = sandbox.stub()
    const ctx: any = {
      state: {
        jwt: {
          token: token.value
        }
      },
      requestInfo: {
        deviceId: 'deviceId'
      }
    }
    await AuthMiddleware.authAssert()(ctx, next)
    await AuthMiddleware.authAssert()(ctx, next)

    expect(next.calledTwice).to.be.true
    expect(getUserFromToken.calledOnce).to.be.true
    expect(ctx.state.user.id).to.eq(user.id)
    expect(ctx.state.token.id).to.eq(token.id)
    expect(ctx.requestInfo.userId).to.eq(user.id)
    expect(ctx.requestInfo.tokenId).to.eq(token.id)
  })

  it('authAssert fail invalid token', async () => {
    const next = sandbox.stub()
    const ctx: any = {
      state: {
        jwt: {
          token: 'fnezuif'
        }
      }
    }
    await expect(AuthMiddleware.authAssert()(ctx, next)).to.be.rejectedWith(Error, 'access_denied')
    expect(next.calledOnce).to.be.false
  })

  it('authAssert fail expired token', async () => {
    token.changed('updatedAt', true)
    token.set(
      {
        updatedAt: moment().subtract({ days: 14 }).format()
      },
      { raw: true }
    )
    await token.save({
      fields: ['updatedAt'],
      silent: true
    })

    const next = sandbox.stub()
    const ctx: any = {
      state: {
        jwt: {
          token: token.value
        },
        token,
        user
      }
    }
    await expect(AuthMiddleware.authAssert()(ctx, next)).to.be.rejectedWith(Error, 'token_expired')
    expect(next.calledOnce).to.be.false
    await expect(token.reload()).to.be.rejectedWith(
      Error,
      'Instance could not be reloaded because it does not exist anymore (find call returned null)'
    )
  })

  it('authAssert fail different device token', async () => {
    const next = sandbox.stub()
    const ctx: any = {
      state: {
        jwt: {
          token: token.value
        }
      },
      requestInfo: {
        DeviceId: 'DeviceId2'
      }
    }

    await expect(AuthMiddleware.authAssert()(ctx, next)).to.be.rejectedWith(Error, 'access_denied')
    expect(next.calledOnce).to.be.false
  })

  it('authAssert fail without token', async () => {
    const next = sandbox.stub()
    const ctx: any = {
      state: {
        jwt: {}
      }
    }
    expect(next.calledOnce).to.be.false
    expect(AuthMiddleware.authAssert()(ctx, next)).to.be.rejectedWith(Error, 'access_denied')
  })

  it('authAssert fail inactive', async () => {
    await user.update({ isActive: false })

    const next = sandbox.stub()
    const ctx: any = {
      requestInfo: {
        ip: '127.0.0.1'
      },
      state: {
        jwt: {
          token: token.value
        }
      }
    }
    await expect(AuthMiddleware.authAssert({ isActive: true })(ctx, next)).to.be.rejectedWith(Error, 'disabled_account')

    expect(next.calledOnce).to.be.false
  })

  it('authAssert fail not verified email', async () => {
    await user.update({ verifyEmail: false })

    const next = sandbox.stub()
    const ctx: any = {
      requestInfo: {
        ip: '127.0.0.1'
      },
      state: {
        jwt: {
          token: token.value
        }
      }
    }
    await expect(AuthMiddleware.authAssert({ verifyEmail: true })(ctx, next)).to.be.rejectedWith(Error, 'access_denied')

    expect(next.calledOnce).to.be.false
  })

  describe('Auth optional', () => {
    it('Should auth optional without token value', async () => {
      const next = sandbox.stub()
      const ctx: any = {
        state: {
          jwt: {}
        },
        requestInfo: {}
      }
      await AuthMiddleware.authAssertOptional()(ctx, next)
      expect(next.calledOnce).to.be.true
    })

    it('Should auth optional without valid token', async () => {
      const next = sandbox.stub()
      const spyGetUserToken = sandbox.stub(AuthMiddleware, 'getUserFromToken')
      const ctx: any = {
        state: {
          jwt: {
            token: 'invalid-token'
          }
        },
        requestInfo: {}
      }
      await AuthMiddleware.authAssertOptional()(ctx, next)
      expect(spyGetUserToken.calledWith('invalid-token')).to.be.true
      expect(next.calledOnce).to.be.true
    })

    it('Should auth optional with token', async () => {
      const next = sandbox.stub()
      const ctx: any = {
        state: {
          jwt: {
            token: token.value
          }
        },
        requestInfo: {}
      }

      await AuthMiddleware.authAssertOptional()(ctx, next)

      expect(next.calledOnce).to.be.true
      expect(ctx.state.user.id).to.be.eq(user.id)
      expect(ctx.state.token.id).to.be.eq(token.id)
      expect(ctx.requestInfo.userId).to.be.eq(user.id)
      expect(ctx.requestInfo.tokenId).to.be.eq(token.id)
    })

    it('Should auth optional with token & user in state', async () => {
      const next = sandbox.stub()
      const ctx: any = {
        state: {
          jwt: {
            token: token.value
          },
          token,
          user
        },
        requestInfo: {}
      }

      await AuthMiddleware.authAssertOptional()(ctx, next)

      expect(next.calledOnce).to.be.true
      expect(ctx.state.user.id).to.be.eq(user.id)
      expect(ctx.state.token.id).to.be.eq(token.id)
      expect(ctx.requestInfo.userId).to.be.eq(user.id)
      expect(ctx.requestInfo.tokenId).to.be.eq(token.id)
    })
  })

  describe('getUserFromToken', () => {
    it('Should get user token auth only type auth', async () => {
      const tokenResetPassword = await Models.Token.create({
        value: '22b22222-0395-447a-bbbb-000000000001',
        type: IEnumTokenType.RESET_PASSWORD,
        UserId: user.id
      } as ITokenAttribute)

      const token = await AuthMiddleware.getUserFromToken(tokenResetPassword.value)

      expect(token).to.be.null
    })

    it('getUserFromToken', async () => {
      const tokenAuth: any = await AuthMiddleware.getUserFromToken(token?.value)

      expect(tokenAuth.id).to.eq(token.id)
      expect(tokenAuth.User.id).to.eq(user.id)
    })
  })
})
