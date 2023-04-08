import Utils from '@helpers/utils';
import { IService } from '../types/system/service';
import { IServiceEvent } from '../types/system/serviceEvent';

const APIService: IService = {
  NEED_CONNECTIONS: ['postgres'],

  start(event: IServiceEvent): Promise<any> {
    // do whatever you want here
    return Promise.resolve(event);
  },

  stop: Utils.noop
};

export default APIService;
