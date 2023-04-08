import * as Koa from 'koa';
import MainMiddleware from '@api-user/v1/middlewares/index';
import logger from '@logger';
import config from '@config';

const llo = logger.logMeta.bind(null, { service: 'api-user' });

const API = (): Promise<Koa> =>
  new Promise((resolve) => {

    const app = new Koa();

    app.proxy = config.REMOTE_EXECUTION;

    app.on('error', (error) => {
      logger.error('Unexpected API User error', llo({ error }));
    });

    app.use(MainMiddleware());

    const server = app.listen(config.SERVICES.API_USER.PORT, () => {
      logger.info('Listening', llo({ port: config.SERVICES.API_USER.PORT }));
      resolve(app);
    });

    server.setTimeout(config.SERVICES.API_USER.TIMEOUT * 1000);
  });

export default API;
