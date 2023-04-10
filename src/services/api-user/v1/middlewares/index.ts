import * as compose from 'koa-compose'
import * as bodyParser from 'koa-bodyparser'
import * as cors from '@koa/cors'
import authMiddleware from '@api-user/v1/middlewares/auth'
import utilsMiddleware from '@api-user/v1/middlewares/utils'
import originHelper from '@helpers/origin'
import securityMiddleware from '@api-user/v1/middlewares/security'
import loggerMiddleware from '@api-user/v1/middlewares/logger'
import errorMiddleware from '@api-user/v1/middlewares/error'
import mainRouter from '@api-user/v1/routers'

const initMainRouter = mainRouter.router()

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

    initMainRouter.routes(),
    initMainRouter.allowedMethods()
  ])
