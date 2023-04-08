import config from '@config';
import Models from '@postgresModels';
import { assertExposable, throwExposable } from '@errors';
import Utils from '@helpers/utils';
import { IRequestInfo } from '../../../../types/system/requestInfo';
import {
  IAskLogin,
  IChangePassword,
  ILogin,
  IResetPassword,
  ISignup,
  IUpdateUser
} from '../../../../types/routers/req/user';
import { IEnumTokenType, ITokenAttribute, IUserAttribute } from '../../../../types/db/db';
import Postgres from '../../../../modules/postgres';
import { ITxOpts } from '../../../../types/db/transaction';
import { IEnumEnvironment } from '../../../../types/config/config';
import {
  IAskTwoFactorRes,
  IEnumLoginType,
  ILoginRes,
  ILoginTypeRes,
  IUserRes
} from '../../../../types/routers/res/user';
import * as moment from 'moment';
import logger from '@logger';
import AuthMiddleware from '@api-user/v1/middlewares/auth';
import Notification from '@modules/notification';

const llo = logger.logMeta.bind(null, { service: 'api-user:controller:user' });

const UserController = {
  //////// NO AUTH
  createUser: async (rawUser: ISignup, opts: IRequestInfo): Promise<ILoginTypeRes> => {

    assertExposable(config.ALLOW_SIGNUP, 'signup_disabled');

    const user = await Postgres.executeTxFn(async (tOpts: ITxOpts) => {

      const userExisting = await Models.User.findByEmail(rawUser.email, tOpts);

      if (userExisting) {
        if (!(await userExisting.validPassword(rawUser.password))) {
          await UserController._checkFailedLoginAttempts(userExisting, tOpts);
          await tOpts.transaction.commit();
          return false;
        } else {
          await tOpts.transaction.rollback();
          return userExisting;
        }
      }

      const newUser = await Models.User.create(rawUser as any, tOpts);
      await tOpts.transaction.commit();

      logger.info('User created', llo({ userId: newUser.id }));

      return newUser;
    });

    if (!user) {
      return { type: IEnumLoginType.email };
    }

    return UserController.askLogin({ email: rawUser.email, password: rawUser.password }, opts);
  },

  askLogin: async ({ email, password }: IAskLogin, opts: IRequestInfo): Promise<ILoginTypeRes> => {

    const logInfo: any = { email };

    const { user, pinCode } = await Postgres.executeTxFn(async (tOpts: ITxOpts) => {
      const user = await Models.User.findByEmail(email, tOpts);
      assertExposable((user && user.isActive), 'bad_credentials', null, null, {
        // password,
        email
      });
      logInfo.logInfo = user.id;

      const validPassword = await user.validPassword(password);
      if (!validPassword) {
        await UserController._checkFailedLoginAttempts(user, tOpts);
        await tOpts.transaction.commit();

        throwExposable('bad_credentials', null, null, {
          // password,
          email
        });
      }

      if (!user.twoFactor) {
        const { token, pinCode } = await Models.Token.createFor2FAEmail(user, opts, tOpts);

        if (config.ENVIRONMENT === IEnumEnvironment.dev) {
          logInfo.token = token.value;
        }

        await tOpts.transaction.commit();
        return { user, pinCode };

      } else {
        await tOpts.transaction.rollback();
        return { user };
      }
    });

    if (pinCode) {
      Utils.setImmediateAsync(() => Notification.askLogin(user.filterKeys(), pinCode, opts));
      Utils.setImmediateAsync(() => Notification.askLogin(user.filterKeys(), pinCode, opts));
    }

    logger.verbose('User ask login', llo(logInfo));

    return {
      type: user.twoFactor ? IEnumLoginType.twoFa : IEnumLoginType.email
    };
  },

  login: async ({ email, password, twoFaCode }: ILogin, opts: IRequestInfo): Promise<ILoginRes> => {

    const { user, jwt } = await Postgres.executeTxFn(async (tOpts: ITxOpts) => {

      const user = await Models.User.findByEmail(email, tOpts);
      assertExposable((user && user.isActive), 'bad_credentials', null, null, {
        // password,
        email,
        twoFaCode
      });

      const validPassword = await user.validPassword(password);

      if (!validPassword) {
        await UserController._checkFailedLoginAttempts(user, tOpts);
        await tOpts.transaction.commit();

        throwExposable('bad_credentials', null, null, {
          // password,
          email,
          twoFaCode
        });
      }

      if (user.email !== config.DEMO_ACCOUNT) {

        try {

          await Models.Token.verify2FA(user, twoFaCode, opts, tOpts);

        } catch (error: any) {

          if (['token_expired', 'two_factor_code_invalid'].includes(error.message)) {
            await UserController._checkFailedLoginAttempts(user, tOpts);
            await tOpts.transaction.commit();
          } else {
            await tOpts.transaction.rollback();
          }

          throw error;
        }
      }

      await user.update({ countLoginFailed: 0 }, tOpts);

      if (!user.verifyEmail) {

        await user.update({ verifyEmail: true }, tOpts);
        Utils.setImmediateAsync(() => Notification.validateEmail(user.filterKeys()));
        logger.verbose('User validate email', llo({ userId: user.id }));

      } else {
        Utils.setImmediateAsync(() => Notification.login(user.filterKeys(), opts));
        logger.verbose('User login', llo({ userId: user.id }));
      }

      const jwt = await AuthMiddleware.generateLogin(user, opts, tOpts);

      await tOpts.transaction.commit();

      return { user, jwt };
    });

    return { token: jwt, user: user.filterKeys() };
  },

  askResetPassword: async (email: string, opts: IRequestInfo): Promise<boolean> => {

    const user = await Models.User.findByEmail(email);

    if (!user || !user.isActive) {
      return true;
    }

    const token = await Postgres.executeTxFn(async (tOpts: ITxOpts) => {
      await UserController._checkFailedLoginAttempts(user, tOpts);

      if (!user.isActive) {
        await tOpts.transaction.commit();
        return false;
      }

      const token = await Models.Token.createForResetPassword(user, opts, tOpts);
      await tOpts.transaction.commit();

      return token;
    });

    token && Utils.setImmediateAsync(() => Notification.askResetPassword(user.filterKeys(), token.value));

    logger.verbose('User send reset mail', llo({ userId: user.id }));

    return true;
  },

  resetPassword: async ({ token, newPassword }: IResetPassword): Promise<boolean> => {

    const tokenDb = await Postgres.executeTxFn(async (tOpts: ITxOpts) => {
      const tokenDb = await Models.Token.findByTypeAndValueWithUser(IEnumTokenType.RESET_PASSWORD, token, tOpts);

      assertExposable(!!(tokenDb), 'invalid_token');
      assertExposable(moment(tokenDb.createdAt).isAfter(moment().subtract({ hours: config.SERVICES.API_USER.MAIL_RESET_PASSWORD_EXPIRATION })), 'token_expired');

      if (await tokenDb.User.validPassword(newPassword)) {
        throwExposable('password_should_be_different');
      }

      await tokenDb.User.setPassword(newPassword, tOpts);

      await tokenDb.destroy(tOpts);

      await Promise.all([
        tokenDb.User.removeTokensByType(IEnumTokenType.RESET_PASSWORD, tOpts),
        tokenDb.User.removeTokensByType(IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN, tOpts),
        tokenDb.User.removeTokensByType(IEnumTokenType.CHANGE_EMAIL, tOpts),
        tokenDb.User.removeTokensByType(IEnumTokenType.AUTH, tOpts)
      ]);

      await tOpts.transaction.commit();

      return tokenDb;
    });

    Utils.setImmediateAsync(() => Notification.passwordChanged(tokenDb.User.filterKeys()));

    logger.info('User password reset', llo({ userId: tokenDb.User.id }));

    return true;
  },

  changeEmail: async (token: string): Promise<boolean> => {

    const { tokenDb, newEmail } = await Postgres.executeTxFn(async (tOpts: ITxOpts) => {

      const tokenDb = await Models.Token.findByTypeAndValueWithUser(IEnumTokenType.CHANGE_EMAIL, token, tOpts);

      assertExposable(!!(tokenDb), 'invalid_token');

      const newEmail = tokenDb.extraValue;
      await tokenDb.User.update({ email: newEmail } as any, tOpts);

      await tokenDb.destroy(tOpts);

      await Promise.all([
        tokenDb.User.removeTokensByType(IEnumTokenType.RESET_PASSWORD, tOpts),
        tokenDb.User.removeTokensByType(IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN, tOpts),
        tokenDb.User.removeTokensByType(IEnumTokenType.CHANGE_EMAIL, tOpts),
        tokenDb.User.removeTokensByType(IEnumTokenType.AUTH, tOpts)
      ]);

      await tOpts.transaction.commit();

      return { tokenDb, newEmail };
    });

    Utils.setImmediateAsync(() => Notification.emailChanged(tokenDb.User.filterKeys()));

    logger.info('User email changed', llo({ userId: tokenDb.User.id, newEmail }));

    return true;
  },

  //////// Verified Auth

  async update(user: IUserAttribute, params: IUpdateUser): Promise<IUserRes> {
    let newParams = Utils.removeEmptyStrings(params);

    assertExposable(Object.keys(newParams).length > 0, 'bad_params');

    await user.update(newParams);

    return user.filterKeys();
  },

  async logout(user: IUserAttribute, token: ITokenAttribute): Promise<boolean> {
    await token.destroy();

    logger.verbose('User logout', llo({ userId: user.id }));

    return true;
  },

  async changePassword(user: IUserAttribute, { oldPassword, newPassword }: IChangePassword): Promise<boolean> {

    await Postgres.executeTxFn(async (tOpts: ITxOpts) => {
      await user.reload(tOpts);

      if (!(await user.validPassword(oldPassword))) {
        throwExposable('bad_credentials');
      }

      if (oldPassword === newPassword) {
        throwExposable('password_should_be_different');
      }

      await user.setPassword(newPassword, tOpts);

      await Promise.all([
        user.removeTokensByType(IEnumTokenType.RESET_PASSWORD, tOpts),
        user.removeTokensByType(IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN, tOpts),
        user.removeTokensByType(IEnumTokenType.CHANGE_EMAIL, tOpts),
        user.removeTokensByType(IEnumTokenType.AUTH, tOpts)
      ]);

      await tOpts.transaction.commit();

    });

    Utils.setImmediateAsync(() => Notification.passwordChanged(user.filterKeys()));

    return true;
  },

  async askTwoFactor(user: IUserAttribute, requestInfo: IRequestInfo): Promise<IAskTwoFactorRes> {

    const secret = await Postgres.executeTxFn(async (tOpts: ITxOpts) => {

      await user.reload(tOpts);

      assertExposable(!user.twoFactor, 'two_factor_already_enable', null, null);

      const { secret } = await Models.Token.createFor2Fa(user, requestInfo, tOpts);
      await tOpts.transaction.commit();

      return secret;
    });

    const qrData = `otpauth://totp/${user.email}?secret=${secret}&issuer=AgreeWe`;

    return {
      secret,
      qrData
    };
  },

  async enableTwoFactor(user: IUserAttribute, twoFaCode: string, requestInfo: IRequestInfo): Promise<boolean> {

    await Postgres.executeTxFn(async (tOpts: ITxOpts) => {

      await user.reload(tOpts);

      assertExposable(!user.twoFactor, 'two_factor_already_enable', null, null);

      await user.update({ twoFactor: true }, tOpts);

      await Models.Token.verify2FA(user, twoFaCode, requestInfo, tOpts);

      await Promise.all([
        user.removeTokensByType(IEnumTokenType.RESET_PASSWORD, tOpts),
        user.removeTokensByType(IEnumTokenType.TWO_FACTOR_EMAIL_LOGIN, tOpts),
        user.removeTokensByType(IEnumTokenType.CHANGE_EMAIL, tOpts),
        user.removeTokensByType(IEnumTokenType.AUTH, tOpts)
      ]);

      await tOpts.transaction.commit();
    });
    return true;
  },

  async disableTwoFactor(user: IUserAttribute, twoFaCode: string, requestInfo: IRequestInfo): Promise<boolean> {

    await Postgres.executeTxFn(async (tOpts: ITxOpts) => {

      await user.reload(tOpts);
      assertExposable(user.twoFactor, 'two_factor_not_enabled', null, null);

      try {

        await Models.Token.verify2FA(user, twoFaCode, requestInfo, tOpts);

      } catch (error: any) {
        if (['token_expired', 'two_factor_code_invalid'].includes(error.message)) {
          await UserController._checkFailedLoginAttempts(user, tOpts);
          await tOpts.transaction.commit();
        }
        throw error;
      }

      await user.update({ twoFactor: false }, tOpts);

      await Promise.all([
        user.removeTokensByType(IEnumTokenType.TWO_FACTOR_LOGIN, tOpts),
        user.removeTokensByType(IEnumTokenType.RESET_PASSWORD, tOpts),
        user.removeTokensByType(IEnumTokenType.CHANGE_EMAIL, tOpts),
        user.removeTokensByType(IEnumTokenType.AUTH, tOpts)
      ]);

      await tOpts.transaction.commit();

    });

    Utils.setImmediateAsync(() => Notification.twoFaDisabled(user.filterKeys(), requestInfo));
    return true;
  },

  _checkFailedLoginAttempts: async (user: IUserAttribute, tOpts = {}): Promise<boolean> => {
    const newFailedLoginCount = user.countLoginFailed + 1;

    if (!user.isActive && newFailedLoginCount > config.SERVICES.API_USER.LOGIN_RETRY_ATTEMPTS + 10) {
      throwExposable('disabled_account', null, null, {
        email: user.email
      });
    }

    await user.update({
      isActive: newFailedLoginCount >= config.SERVICES.API_USER.LOGIN_RETRY_ATTEMPTS ? false : user.isActive,
      countLoginFailed: newFailedLoginCount
    }, tOpts);

    if (newFailedLoginCount >= config.SERVICES.API_USER.LOGIN_RETRY_ATTEMPTS) {
      Utils.setImmediateAsync(() => Notification.accountBlocked(user.filterKeys()));
    }

    return true;
  }

};

export default UserController;
