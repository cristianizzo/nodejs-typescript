import * as Koa from 'koa';
import { throwExposable } from '@helpers/errors';

interface UtilMiddleware {
  noop: (ctx: Koa.Context, next: Koa.Next) => Promise<void>;
  onBodyParserError: (error: any) => void;
}

const UtilMiddleware: UtilMiddleware = {
  noop: async (ctx: Koa.Context, next: Koa.Next) => next(),

  onBodyParserError: (error) => {
    if (error.type === 'entity.too.large') {
      throwExposable('entity_too_large');
    } else {
      throwExposable('bad_params', 400, error.message);
    }
  }
};

export default UtilMiddleware;
