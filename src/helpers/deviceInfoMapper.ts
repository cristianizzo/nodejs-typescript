import * as parser from 'ua-parser-js'
import logger from '@logger'
import { assert } from '@errors'

const llo = logger.logMeta.bind(null, { service: 'helpers:DeviceInfoMapper' })

interface IDeviceInfo {
  type: string
  name: string
  vendor: string
  ua: string
}

const DeviceInfoMapper = {
  /**
   *
   * @param userAgent
   * @returns {{
   *   type: String,
   *   name: string,
   *   vendor: string,
   *   ua: string,
   * }}
   */
  getDeviceInfo(userAgent?: string): IDeviceInfo {
    const info: IDeviceInfo = {} as IDeviceInfo // eslint-disable-line

    try {
      assert(!!userAgent, 'userAgent empty', { userAgent })
      const data: any = parser(userAgent)

      info.ua = data.ua
      info.type = 'web'
      info.name = data.browser.name
      info.vendor = 'web'

      if (data?.device?.type) {
        info.type = data.device.type
        info.name = data.device.model
        info.vendor = data.device.vendor
      }
    } catch (error) {
      logger.error('Impossible to get device info', llo({ error }))
    }

    return info
  }
}

export default DeviceInfoMapper
