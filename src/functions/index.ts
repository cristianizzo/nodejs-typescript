import { IServiceEvent } from '../types/system/serviceEvent';
import Runner from '@modules/runner';
import app from './app';

export const handler = async (event: IServiceEvent): Promise<any> =>
  Runner([{ app, event }]);
