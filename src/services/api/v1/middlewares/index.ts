import compose from 'koa-compose';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import authMiddleware from './auth'
import utilsMiddleware from './util';
import originHelper from '../../../../helpers/origin';
import securityMiddleware from './security'
import loggerMiddleware from './logger'
import errorMiddleware from './error'
import mainRouter from '../routers'

export default () =>
  compose([
    loggerMiddleware(),
    errorMiddleware(),
    authMiddleware.readJWT(),

    bodyParser({
      enableTypes: ['json', 'form', 'text'],
      jsonLimit: '8mb',
      textLimit: '8mb',
      formLimit: '8mb',
      onerror: utilsMiddleware.onBodyParserError
    }),

    cors({ origin: originHelper }),

    securityMiddleware(),

    mainRouter.routes(),
    mainRouter.allowedMethods()
  ]);
