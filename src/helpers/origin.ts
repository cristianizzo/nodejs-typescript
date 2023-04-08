import config from '@config';
import { throwExposable } from '@errors';
import { DefaultContext } from 'koa';

export default (ctx: DefaultContext): string => {
  const requestOrigin: string = ctx.accept.headers.origin;
  const corsOrigins: string[] = config.SERVICES.API_USER.CORS || [];

  if (corsOrigins.length > 0 && !config.SERVICES.API_USER.CORS.includes(requestOrigin)) {
    throwExposable('invalid_origin');
  }

  return requestOrigin;
};
