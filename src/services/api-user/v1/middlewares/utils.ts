import * as Koa from 'koa'
import { throwExposable } from '@helpers/errors'

const UtilMiddleware = {
  noop: async (ctx: Koa.Context, next: Koa.Next) => await next(),

  onBodyParserError: (error) => {
    if (error.type === 'entity.too.large') {
      throwExposable('entity_too_large')
    } else {
      throwExposable('bad_params', 400, error.message)
    }
  }
}

export default UtilMiddleware
