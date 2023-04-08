// const path = require('path');
// const rp = require('request-promise');
// const Decimal = require('decimal.js');
// const config = require('../config');
// const Models = require(path.join(srcDir, '/models/pg'));
// const Crypto = require(path.join(srcDir, '/helpers/crypto'));
// const speakeasy = require('speakeasy');
// const CIPHER_2FA = require(path.join(srcDir, '../config')).CIPHER_2FA;
// let i = 0;
//
// const TestUtils = {
//   async apiCall({ method, uri, fullResponse, params, body, auth, headers }) {
//     const opts = {
//       method,
//       uri: uri,
//       baseUrl: config.SERVICES.API.BASE_URL,
//       json: true,
//       resolveWithFullResponse: fullResponse || false,
//     };
//
//     if (params) {
//       opts.qs = params;
//     }
//
//     if (body) {
//       opts.body = body;
//     }
//
//     if (auth) {
//       opts.auth = { bearer: auth };
//     }
//
//     if (headers) {
//       opts.headers = Object.assign(opts.headers || {}, headers);
//     }
//
//     // try {
//     const res = await rp(opts);
//     return res;
//     // } catch(e) {
//     // console.log(e.statusCode);
//     // console.log(e.error);
//     // throw e;
//     // }
//   },
//
//   // deprecated
//   async callApi(method = 'get', uri, auth, params, body, fullResponse = false, headers) {
//     return TestUtils.apiCall({
//       method,
//       uri,
//       auth,
//       params,
//       body,
//       fullResponse,
//       headers,
//     });
//   },
//
//   async getLoginToken(email) {
//     const user = await Models.User.findByEmail(email);
//     const tokens = await user.getTokensByType(Models.Token.TYPE.TWO_FACTOR_EMAIL_LOGIN);
//     const token = tokens[0];
//     let twoFaCode = null;
//     if (token) {
//       twoFaCode = Crypto.decrypt(token.value, CIPHER_2FA);
//     }
//
//     return {
//       token,
//       twoFaCode,
//     };
//   },
//
//   async get2faEmailWithdrawTokenAndCode(email) {
//     const user = await Models.User.findByEmail(email);
//     const tokens = await user.getTokensByType(Models.Token.TYPE.TWO_FACTOR_EMAIL_WITHDRAW);
//     const token = tokens[0];
//     let twoFaCode = null;
//     if (token) {
//       twoFaCode = Crypto.decrypt(token.value, CIPHER_2FA);
//     }
//
//     return {
//       token,
//       twoFaCode,
//     };
//   },
//
//   async getResetPasswordToken(userId) {
//     const user = await Models.User.findByPk(userId);
//     const tokens = await user.getTokensByType(Models.Token.TYPE.RESET_PASSWORD);
//     expect(tokens.length).to.eq(1);
//     return tokens[0];
//   },
//
//   async getChangeEmailToken(userId) {
//     const user = await Models.User.findByPk(userId);
//     const tokens = await user.getTokensByType(Models.Token.TYPE.CHANGE_EMAIL);
//     expect(tokens.length).to.eq(1);
//     return tokens[0];
//   },
//
//   async newUser(userObj = {}, createAllWallet = false) {
//     // eslint-disable-line no-unused-vars
//
//     i++;
//
//     const salt = Math.floor(Math.random() * 1000000);
//     const salt2 = Math.floor(Math.random() * 1000000);
//     const password = Crypto.sha.hash('NothingIsRandom');
//
//     const rawUser = Object.assign(
//       {
//         firstName: 'firstNameTest',
//         lastName: 'lastNameTest',
//         email: `${salt2}_${salt}_${i}@email.com`,
//         password: password,
//         termsVersion: '1.1',
//         currency: 'EUR',
//         language: 'FR',
//       },
//       userObj
//     );
//
//     await TestUtils.callApi('post', '/user/create', null, null, rawUser);
//     const { twoFaCode } = await TestUtils.getLoginToken(rawUser.email);
//     const resLogin = await TestUtils.callApi('post', '/user/login', null, null, {
//       email: rawUser.email,
//       password: rawUser.password,
//       twoFaCode,
//     });
//
//     const user = await Models.User.findByEmail(rawUser.email);
//     user.Kyc = await TestUtils.setKYC(user.id);
//     await TestUtils.setTax(user.id);
//
//     if (createAllWallet) {
//       await Promise.all(
//         config.WALLETS.SUPPORTED_DEPOSIT_COINS.map((coin) =>
//           TestUtils.callApi('post', '/wallet', resLogin.token, null, { coinCode: coin })
//         )
//       );
//     }
//
//     return { token: resLogin.token, password, user };
//   },
//
//   async setAdmin(userId, role = Models.Admin.ROLE.LEVEL_0) {
//     const user = await Models.User.findByPk(userId);
//     const admin = await Models.Admin.create({ role });
//     await admin.setUser(user);
//   },
//
//   async verifyEmailUser(userId, verifyEmail = true) {
//     const user = await Models.User.findByPk(userId);
//     await user.update({ verifyEmail });
//   },
//
//   async activeUser(userId, active = true) {
//     const user = await Models.User.findByPk(userId);
//     await user.update({ active });
//   },
//
//   async createExchange(exchangeObj = {}) {
//     const rawExchange = Object.assign(
//       {
//         amountFrom: 1,
//         amountTo: 2,
//         rate: 2,
//         status: 'CREDITED',
//       },
//       exchangeObj
//     );
//
//     return Models.Exchange.create(rawExchange);
//   },
//
//   async fundWallet(WalletId, amount) {
//     const wallet = await Models.Wallet.findByPk(WalletId);
//     return wallet.updateBalance(Decimal(wallet.balance).add(amount).toFixed());
//   },
//
//   async getStatus() {
//     return TestUtils.apiCall({
//       method: 'get',
//       uri: `/`,
//     });
//   },
//
//   async enable2Fa(resUser) {
//     const res2FA = await TestUtils.callApi('get', '/user/ask-two-factor', resUser.token);
//
//     let twoFaCode = speakeasy.totp({
//       secret: res2FA.secret,
//       encoding: 'base32',
//     });
//
//     // Enable two factor
//     await TestUtils.callApi('post', '/user/enable-two-factor', resUser.token, null, { twoFaCode });
//
//     // Login with 2FA
//     return await TestUtils.callApi('post', '/user/login', null, null, {
//       email: resUser.user.email,
//       password: resUser.password,
//       twoFaCode,
//     });
//   },
// };
//
// module.exports = TestUtils;
