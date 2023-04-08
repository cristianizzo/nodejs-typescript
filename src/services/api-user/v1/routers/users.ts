import * as Router from '@koa/router';
import { schema } from '@api-user/v1/routers/schema/validation';
import UserSchema from '@api-user/v1/routers/schema/user';
import UserController from '@api-user/v1/controllers/user';
import { pick } from 'lodash';
import { ParameterizedContext } from 'koa';
import AuthMiddleware from '@api-user/v1/middlewares/auth';

const UsersRouter = {

  //////// NO AUTH
  async createUser(ctx: ParameterizedContext) {

    const params = pick(ctx.request.body, ['firstName', 'lastName', 'email', 'password', 'termsVersion']);

    const formattedParams = await schema.validateParams(UserSchema.createUser, params);

    ctx.body = await UserController.createUser(formattedParams, ctx.requestInfo);
  },

  async askLogin(ctx: ParameterizedContext) {

    const params = pick(ctx.request.body, ['email', 'password']);

    const formattedParams = await schema.validateParams(UserSchema.askLogin, params);

    ctx.body = await UserController.askLogin({
      email: formattedParams.email,
      password: formattedParams.password
    }, ctx.requestInfo);
  },

  async login(ctx: ParameterizedContext) {

    const params = pick(ctx.request.body, ['email', 'password', 'twoFaCode']);

    const formattedParams = await schema.validateParams(UserSchema.login, params);

    ctx.body = await UserController.login({
      email: formattedParams.email,
      password: formattedParams.password,
      twoFaCode: formattedParams.twoFaCode
    }, ctx.requestInfo);
  },

  async askResetPassword(ctx: ParameterizedContext) {

    const params = pick(ctx.request.body, ['email']);

    const formattedParams = await schema.validateParams(UserSchema.askResetPassword, params);

    await UserController.askResetPassword(formattedParams.email, ctx.requestInfo);

    ctx.body = true;
  },

  async resetPassword(ctx: ParameterizedContext) {

    const params = pick(ctx.request.body, ['token', 'newPassword']);

    const formattedParams = await schema.validateParams(UserSchema.resetPassword, params);

    await UserController.resetPassword(formattedParams);

    ctx.body = true;
  },

  async changeEmail(ctx: ParameterizedContext) {

    const params = pick(ctx.request.body, ['token']);

    const formattedParams = await schema.validateParams(UserSchema.changeEmail, params);

    await UserController.changeEmail(formattedParams.token);

    ctx.body = true;
  },


  //////// Verified Auth

  async getUser(ctx: ParameterizedContext) {
    ctx.body = ctx.state.user.filterKeys();
  },

  async updateUser(ctx: ParameterizedContext) {

    const params = pick(ctx.request.body, 'firstName', 'lastName', 'avatar', 'termsVersion');

    const formattedParams = await schema.validateParams(UserSchema.updateUser, params);

    ctx.body = await UserController.update(ctx.state.user, formattedParams);
  },

  async logout(ctx: ParameterizedContext) {

    await UserController.logout(ctx.state.user, ctx.state.token);

    ctx.body = true;
  },

  async changePassword(ctx: ParameterizedContext) {

    const params = pick(ctx.request.body, 'oldPassword', 'newPassword');

    const formattedParams = await schema.validateParams(UserSchema.changePassword, params);

    await UserController.changePassword(ctx.state.user, formattedParams);

    ctx.body = true;
  },

  async askTwoFactor(ctx: ParameterizedContext) {

    ctx.body = await UserController.askTwoFactor(ctx.state.user, ctx.requestInfo);
  },

  async enableTwoFactor(ctx: ParameterizedContext) {

    const params = pick(ctx.request.body, 'twoFaCode');

    const formattedParams = await schema.validateParams(UserSchema.enableTwoFactor, params);

    await UserController.enableTwoFactor(ctx.state.user, formattedParams.twoFaCode, ctx.requestInfo);

    ctx.body = true;
  },

  async disableTwoFactor(ctx: ParameterizedContext) {

    const params = pick(ctx.request.body, 'twoFaCode');

    const formattedParams = await schema.validateParams(UserSchema.disableTwoFactor, params);

    await UserController.disableTwoFactor(ctx.state.user, formattedParams.twoFaCode, ctx.requestInfo);

    ctx.body = true;
  },


  router() {
    const router = new Router();
    const authed = AuthMiddleware.authAssert({ isActive: true, verifyEmail: true });


    //////// NO AUTH

    /**
     * @api {post} /user/create User creation
     * @apiName user_create
     * @apiGroup User
     * @apiDescription User creation
     *
     * @apiSampleRequest /user/create
     *
     * @apiParam {object} rawUser
     * @apiParam {string} rawUser.firstName
     * @apiParam {string} rawUser.lastName
     * @apiParam {string} rawUser.email
     * @apiParam {string} rawUser.password
     * @apiParam {boolean} rawUser.terms
     */
    router.post('/create', UsersRouter.createUser);

    /**
     * @api {post} /user/ask-login ask for login
     * @apiName user_ask_login
     * @apiGroup User
     * @apiDescription Ask login user
     *
     * @apiSampleRequest /user/ask-login
     *
     * @apiParam {string} email
     * @apiParam {string} password
     *
     * @apiSuccess {Boolean} result
     */
    router.post('/ask-login', UsersRouter.askLogin);

    /**
     * @api {post} /user/login Login
     * @apiName user_login
     * @apiGroup User
     * @apiDescription Login user
     *
     * @apiSampleRequest /user/login
     *
     * @apiParam {string} email
     * @apiParam {string} password
     *
     * @apiSuccess {Object} data
     * @apiSuccess {string} data.token User Token
     * @apiSuccess {string} data.user User Data
     */
    router.post('/login', UsersRouter.login);

    /**
     * @api {post} /user/ask-reset-password User send mail reset password
     * @apiName user_ask_reset_password
     * @apiGroup User
     * @apiDescription User send mail reset password
     *
     * @apiSampleRequest /user/ask-reset-password
     *
     * @apiParam {string} email
     */
    router.post('/ask-reset-password', UsersRouter.askResetPassword);

    /**
     * @api {post} /user/reset-password User reset password
     * @apiName user_reset_password
     * @apiGroup User
     * @apiDescription User reset password
     *
     * @apiSampleRequest /user/reset-password
     *
     * @apiParam {string} token
     * @apiParam {string} newPassword
     */
    router.post('/reset-password', UsersRouter.resetPassword);

    /**
     * @api {post} /user/change-email User change email
     * @apiName user_change_email
     * @apiGroup User
     * @apiDescription User change email
     *
     * @apiSampleRequest /user/change-email
     *
     * @apiParam {string} token
     */
    router.post('/change-email', UsersRouter.changeEmail);


    //////// Verified Auth

    /**
     * @api {put} /user/update User Update
     * @apiName user_update
     * @apiGroup User
     * @apiDescription User Update
     *
     * @apiSampleRequest /user/update
     *
     * @apiParam {string} firstName
     * @apiParam {string} lastName
     */
    router.put('/update', authed, UsersRouter.updateUser);

    /**
     * @api {get} /user/me Get user info
     * @apiName user_get
     * @apiGroup User
     * @apiDescription Get user information
     *
     * @apiSampleRequest /user/me
     *
     * @apiSuccess {Object} userData
     */
    router.get('/me', authed, UsersRouter.getUser);

    /**
     * @api {get} /user/logout Logout
     * @apiName user_logout
     * @apiGroup User
     * @apiDescription Logout user
     *
     * @apiSampleRequest /user/logout
     *
     * @apiSuccess {Boolean} isSuccess
     */
    router.get('/logout', authed, UsersRouter.logout);

    /**
     * @api {post} /user/change-password User change password
     * @apiName user_change_password
     * @apiGroup User
     * @apiDescription User change password
     *
     * @apiSampleRequest /user/change-password
     *
     * @apiParam {string} oldPassword
     * @apiParam {string} newPassword
     */
    router.post('/change-password', authed, UsersRouter.changePassword);

    /**
     * @api {post} /user/ask-two-factor Ask for a two factor auth code
     * @apiName user_ask_two_factor
     * @apiGroup User
     * @apiDescription Requests to enable two factor and for a shared secret
     *
     * @apiSampleRequest /user/ask-two-factor
     *
     * @apiSuccess {Object} twoFactorData
     * @apiSuccess {string} twoFactorData.secret Base32 secret to store
     * @apiSuccess {string} twoFactorData.qrData otpauth URI to display in QR code
     */
    router.get('/ask-two-factor', authed, UsersRouter.askTwoFactor);

    /**
     * @api {post} /user/enable-two-factor Enable two factor auth
     * @apiName user_enable_two_factor
     * @apiGroup User
     * @apiDescription Validate the secret and enable two factor authentication
     *
     * @apiSampleRequest /user/enable-two-factor
     *
     * @apiParam {string} twoFaCode TOTP token
     */
    router.post('/enable-two-factor', authed, UsersRouter.enableTwoFactor);

    /**
     * @api {post} /user/disable-two-factor Disable two factor auth
     * @apiName user_disable_two_factor
     * @apiGroup User
     * @apiDescription Removes two factor authentication
     *
     * @apiSampleRequest /user/disable-two-factor
     *
     * @apiParam {string} twoFaCode TOTP token
     */
    router.post('/disable-two-factor', authed, UsersRouter.disableTwoFactor);

    return router;
  }
};

export default UsersRouter;
