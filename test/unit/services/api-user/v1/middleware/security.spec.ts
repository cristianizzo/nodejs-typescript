import * as sinon from 'sinon'
import { expect } from 'chai'
import SecurityMiddleware from '@api-user/v1/middlewares/security'

describe('Middleware: Security', () => {
  let sandbox: any = null

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox && sandbox.restore()
  })

  it('Should set security headers', async () => {
    const middleware = SecurityMiddleware()

    const ctx: any = {
      response: {
        set: sandbox.stub()
      }
    }

    const next = sandbox.stub().resolves('data')

    const res = await middleware(ctx, next)

    expect(ctx.response.set.calledWith('referrer-policy', 'no-referrer')).to.be.true
    expect(ctx.response.set.calledWith('x-content-type-options', 'nosniff')).to.be.true
    expect(ctx.response.set.calledWith('x-frame-options', 'DENY')).to.be.true
    expect(ctx.response.set.calledWith('content-security-policy', "default-src 'self' https:")).to.be.true
    expect(ctx.response.set.calledWith('x-xss-protection', '1; mode=block')).to.be.true
    expect(ctx.response.set.calledWith('strict-transport-security', 'max-age=2592000; includeSubDomains')).to.be.true

    expect(res).to.eq('data')
  })
})
