import * as sinon from 'sinon'
import { expect } from 'chai'
import origin from '@helpers/origin'
import config from '@config'

describe('Helpers: Origin', () => {
  let sandbox: any = null

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox?.restore()
  })

  it('Should allow origin when not set', async () => {
    const request = origin({
      accept: { headers: { origin: 'https://agreewe.io' } }
    })
    expect(request).to.eq('https://agreewe.io')
  })

  it('Should allow origin when set', async () => {
    config.SERVICES.API_USER.CORS = ['https://agreewe.io']

    const request = origin({
      accept: { headers: { origin: 'https://agreewe.io' } }
    })
    expect(request).to.eq('https://agreewe.io')
  })

  it('Should throw error invalid_origin', async () => {
    const oldRef = config.SERVICES.API_USER.CORS
    config.SERVICES.API_USER.CORS = ['https://agreewe.io']

    expect(() =>
      origin({
        accept: { headers: { origin: 'https://xxx.io' } }
      })
    ).to.throw('invalid_origin')

    config.SERVICES.API_USER.CORS = oldRef
  })
})
