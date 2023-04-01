import Koa from 'koa'
import MainMiddleware from './v1/middlewares/index'
import logger from '../../modules/logger'
import config from '../../../config';

const llo = logger.logMeta.bind(null, {service: 'api'});

const API = (): Promise<Koa> =>
  new Promise((resolve) => {

    const app = new Koa();

    app.proxy = config.REMOTE_EXECUTION;

    app.on('error', (error) => {
      logger.error('Unexpected API error', llo({error}));
    });

    app.use(MainMiddleware());

    const server = app.listen(config.SERVICES.API.PORT, () => {
      logger.info('Listening', llo({port: config.SERVICES.API.PORT}));
      resolve(app);
    });

    server.setTimeout(config.SERVICES.API.TIMEOUT * 1000);
  });

export default API;
