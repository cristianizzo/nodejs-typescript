import Utils from '@helpers/utils'
import { IService } from '@type/system/service'
import { IServiceEvent } from '@type/system/serviceEvent'

const APIService: IService = {
  NEED_CONNECTIONS: ['postgres'],

  async start(event?: IServiceEvent): Promise<any> {
    // do whatever you want here
    return await Promise.resolve(event)
  },

  stop: Utils.noop
}

export default APIService
