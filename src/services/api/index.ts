import {IService} from '../../types/system/service';
import Utils from '../../helpers/utils';
import app from './app';

const APIService: IService = {
  NEED_CONNECTIONS: ['postgres'],

  start() {
    return app();
  },

  stop: Utils.noop,
};

export default APIService;
