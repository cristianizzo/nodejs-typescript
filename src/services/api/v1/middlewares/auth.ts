import {IAssertOpts, IJWTData} from "../../../../types/system/middleware";
import jwt from 'jsonwebtoken';
import koaJWT, {Middleware, Options} from 'koa-jwt';
import moment from 'moment';
import Models from "../../../../models/pg/";
import logger from "../../../../modules/logger";
import config from "../../../../../config";
import {ITxOpts} from "../../../../types/db/transaction";
import {IRequestInfo} from "../../../../types/system/requestInfo";
import {IEnumTokenType, ITokenAttribute, IUserAttribute} from "../../../../types/db/db";
import Koa, {ParameterizedContext} from "koa";
import {assertExposable, throwError} from "../../../../helpers/errors";

const llo = logger.logMeta.bind(null, {service: 'api:middleware:auth'});

const JWT_KEY = 'jwt';

const AuthMiddleware = {

  generateJWT: (jwtData: IJWTData): string => {
    return jwt.sign(jwtData, config.JWT_SECRET);
  },

  generateJWTLogin: (tokenValue: string, userAgent?: any): string => {
    return AuthMiddleware.generateJWT({
      auth: 'agreewe-user',
      agent: userAgent ? userAgent : '',
      token: tokenValue,
    });
  },

  readJWT: (): Middleware => koaJWT({
    secret: config.JWT_SECRET,
    passthrough: true,
    key: JWT_KEY,
  } as Options),

  generateLogin: async (user: IUserAttribute, requestInfo: IRequestInfo, tOpts: ITxOpts): Promise<string> => {
    const token = await Models.Token.createForLogin(user.id, requestInfo, tOpts);

    return AuthMiddleware.generateJWTLogin(token.value);
  },

  getUserFromToken: async (tokenValue: string): Promise<ITokenAttribute | null & { User: IUserAttribute } | null> => {
    return await Models.Token.findOne({
      where: {
        value: tokenValue,
        type: IEnumTokenType.AUTH,
      },
      include: [
        {
          model: Models.User,
          required: true,
        },
      ],
    });
  },

  /**
   * @param {object} opts
   * @param {bool} [opts.active]  Only allow active users
   * @param {bool} [opts.verify]  Only allow verified users
   * @param {bool} [opts.kyc]     Only allow kyc passed users
   */
  authAssert: (opts: IAssertOpts = {}) => async (ctx: ParameterizedContext, next: Koa.Next): Promise<Koa.Next> => {

    const tokenValue = ctx.state[JWT_KEY] ? ctx.state[JWT_KEY].token : null;
    assertExposable(!!tokenValue, 'access_denied');

    const token = ctx.state.token || (await AuthMiddleware.getUserFromToken(tokenValue));
    assertExposable(!!token, 'access_denied');

    if (moment(token.updatedAt).isBefore(moment().subtract({days: config.SERVICES.API.SESSION_EXPIRATION_DAY}))) {
      await token.destroy();
      throwError('token_expired');
    }

    const user = ctx.state.user || token.User;
    assertExposable(!!user, 'access_denied');

    assertExposable(!(opts.isActive && (!user.isActive)), 'disabled_account');
    assertExposable(!(opts.verifyEmail && !user.verifyEmail), 'access_denied');
    assertExposable(token.deviceId === ctx.requestInfo.deviceId, 'access_denied');

    ctx.state.user = user;
    ctx.state.token = token;
    ctx.requestInfo.tokenId = token.id;
    ctx.requestInfo.userId = user.id;

    return next();
  },

  authAssertOptional: () => async (ctx: ParameterizedContext, next: Koa.Next): Promise<Koa.Next> => {

    const tokenValue = ctx.state[JWT_KEY] ? ctx.state[JWT_KEY].token : null;

    if (!tokenValue) {
      return next();
    }

    const token = ctx.state.token || (await AuthMiddleware.getUserFromToken(tokenValue));

    if (!token) {
      return next();
    }

    ctx.state.token = token;
    ctx.requestInfo.tokenId = token.id;

    const user = ctx.state.user || token.User;

    assertExposable(!!user, 'access_denied');

    ctx.state.user = user;
    ctx.requestInfo.userId = user.id;

    return next();
  },

};

export default AuthMiddleware;
