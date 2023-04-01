import config from '../../../../../config';
import moment from 'moment';
import * as packageJson from '../../../../../package.json';
import {IAppInfo} from "../../../../types/routers/res/status";

const StatusController = {
  get: (): IAppInfo => ({
    status: 'healthy',
    appName: config.APP_NAME,
    service: config.SERVICES.API.NAME,
    nodeVersion: process.version,
    environment: config.ENVIRONMENT,
    appVersionPackage: packageJson.version,
    time: moment().format(),
  }),
}

export default StatusController;
