import * as Koa from 'koa';
import { IServiceEvent } from '@type/system/serviceEvent';

export type IService = {
  NEED_CONNECTIONS: any;

  start(event?: IServiceEvent): Promise<Koa | any>;

  stop(): void;
};

