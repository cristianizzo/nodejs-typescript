import { IService } from '@type/system/service';
import Utils from '@helpers/utils';
import app from '@api-user/app';

const APIService: IService = {
  NEED_CONNECTIONS: ['postgres', 'mongodb'],

  start() {
    return app();
  },

  stop: Utils.noop
};

export default APIService;
