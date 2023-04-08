import * as sinon from 'sinon';
import { expect } from 'chai';
import DeviceInfoMapper from '../../../src/helpers/deviceInfoMapper';
import logger from '../../../src/modules/logger';

describe('Helpers: DeviceInfoMapper', () => {
  let sandbox: any = null;
  let stubLogger: any;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    stubLogger = sandbox.stub(logger, 'error');
  });

  afterEach(async () => {
    sandbox && sandbox.restore();
  });

  it('should log error empty user agent data', async () => {
    const res = DeviceInfoMapper.getDeviceInfo();
    expect(res).to.be.deep.eq({});
    expect(stubLogger.calledOnce).to.be.true;
  });

  it('should get user agent data mobile', async () => {
    const userAgent = 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Mobile Safari/537.36';

    const res = DeviceInfoMapper.getDeviceInfo(userAgent);
    expect(res).to.be.deep.eq({
      name: 'Pixel 2',
      type: 'mobile',
      ua: 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Mobile Safari/537.36',
      vendor: 'Google'
    });
    expect(stubLogger.calledOnce).to.be.false;
  });

  it('should get user agent data web', async () => {
    const userAgent = ' Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36';

    const res = DeviceInfoMapper.getDeviceInfo(userAgent);
    expect(res).to.be.deep.eq({
      name: 'Chrome',
      type: 'web',
      ua: ' Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36',
      vendor: 'web'
    });
    expect(stubLogger.calledOnce).to.be.false;
  });
});
