import Koa from 'koa';
import {IServiceEvent} from "./serviceEvent";

export interface IService {
  NEED_CONNECTIONS: any;

  start(event?: IServiceEvent): Promise<Koa | any>;

  stop(): void;
}
