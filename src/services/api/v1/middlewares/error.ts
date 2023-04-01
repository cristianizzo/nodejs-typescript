import {Next} from 'koa';
import {RouterContext} from "@koa/router";

export default () => async (ctx: RouterContext, next: Next) => {

  try {
    await next();
  } catch (error: any) {
    ctx.requestInfo = Object.assign({error}, ctx.requestInfo);

    let status = 500;
    const response: any = {
      code: 'unknown_error',
      description: 'Internal server error',
    };

    if (error.exposeCustom_) {
      status = error.status || 500;
      response.code = error.message || 'unknown_error';

      if (error.description) {
        response.description = error.description;
      }
      if (error.exposeMeta) {
        response.meta = error.exposeMeta;
      }
    }

    ctx.status = status;
    ctx.body = response;
  }
};
