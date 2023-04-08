import { IAssertOpts, IJWTData } from '@type/system/middleware'
import * as jwt from 'jsonwebtoken'
import * as koaJWT from 'koa-jwt'
import * as moment from 'moment'
import { ITxOpts } from '@type/db/transaction'
import { IRequestInfo } from '@type/system/requestInfo'
import { IEnumTokenType, ITokenAttribute, IUserAttribute } from '@type/db/db'
import { Next, ParameterizedContext } from 'koa'
import { assertExposable, throwError } from '@helpers/errors'
import Models from '@postgresModels'
import config from '@config'

const JWT_KEY = 'jwt'

const AuthMiddleware = {
  generateJWT: (jwtData: IJWTData): string => {
    return jwt.sign(jwtData, config.JWT_SECRET)
  },

  generateJWTLogin: (tokenValue: string, userAgent?: any): string => {
    return AuthMiddleware.generateJWT({
      auth: 'agreewe-user',
      agent: userAgent || '',
      token: tokenValue
    })
  },

  readJWT: (): koaJWT.Middleware =>
    koaJWT({
      secret: config.JWT_SECRET,
      passthrough: true,
      key: JWT_KEY
    }),

  generateLogin: async (user: IUserAttribute, requestInfo: IRequestInfo, tOpts: ITxOpts): Promise<string> => {
    const token = await Models.Token.createForLogin(user.id, requestInfo, tOpts)

    return AuthMiddleware.generateJWTLogin(token.value)
  },

  getUserFromToken: async (tokenValue: string): Promise<ITokenAttribute | (null & { User: IUserAttribute }) | null> => {
    return await Models.Token.findOne({
      where: {
        value: tokenValue,
        type: IEnumTokenType.AUTH
      },
      include: [
        {
          model: Models.User,
          required: true
        }
      ]
    })
  },

  /**
   * @param {object} opts
   * @param {boolean} [opts.active]  Only allow active users
   * @param {boolean} [opts.verify]  Only allow verified users
   * @param {boolean} [opts.kyc]     Only allow kyc passed users
   */
  authAssert:
    (opts: IAssertOpts = {}) =>
    async (ctx: ParameterizedContext, next: Next): Promise<Next> => {
      const tokenValue = ctx.state[JWT_KEY] ? ctx.state[JWT_KEY].token : null
      assertExposable(!!tokenValue, 'access_denied')

      const token = ctx.state.token || (await AuthMiddleware.getUserFromToken(tokenValue))
      assertExposable(!!token, 'access_denied')

      if (moment(token.updatedAt).isBefore(moment().subtract({ days: config.SERVICES.API_USER.SESSION_EXPIRATION_DAY }))) {
        await token.destroy()
        throwError('token_expired')
      }

      const user = ctx.state.user || token.User
      assertExposable(!!user, 'access_denied')

      assertExposable(!(opts.isActive && !user.isActive), 'disabled_account')
      assertExposable(!(opts.verifyEmail && !user.verifyEmail), 'access_denied')
      assertExposable(token.deviceId === ctx.requestInfo.deviceId, 'access_denied')

      ctx.state.user = user
      ctx.state.token = token
      ctx.requestInfo.tokenId = token.id
      ctx.requestInfo.userId = user.id

      return await next()
    },

  authAssertOptional:
    () =>
    async (ctx: ParameterizedContext, next: Next): Promise<Next> => {
      const tokenValue = ctx.state[JWT_KEY] ? ctx.state[JWT_KEY].token : null

      if (!tokenValue) {
        return await next()
      }

      const token = ctx.state.token || (await AuthMiddleware.getUserFromToken(tokenValue))

      if (!token) {
        return await next()
      }

      ctx.state.token = token
      ctx.requestInfo.tokenId = token.id

      const user = ctx.state.user || token.User

      assertExposable(!!user, 'access_denied')

      ctx.state.user = user
      ctx.requestInfo.userId = user.id

      return await next()
    }
}

export default AuthMiddleware
