import config from '@config';
import * as moment from 'moment';
import * as packageJson from '../../../../../package.json';
import { IAppInfo } from '@type/routers/res/status';

const StatusController = {
  get: (): IAppInfo => ({
    status: 'healthy',
    appName: config.APP_NAME,
    service: config.SERVICES.API_USER.NAME,
    nodeVersion: process.version,
    environment: config.ENVIRONMENT,
    appVersionPackage: packageJson.version,
    time: moment().format()
  })
};

export default StatusController;
