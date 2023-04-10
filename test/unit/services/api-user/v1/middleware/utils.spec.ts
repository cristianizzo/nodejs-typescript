import * as sinon from 'sinon'
import { expect } from 'chai'
import UtilMiddleware from '@api-user/v1/middlewares/utils'

describe('Middleware: utils', () => {
  let sandbox: any = null

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox && sandbox.restore()
  })

  it('noop', async () => {
    const next = sinon.stub().resolves('next1')
    const ctx: any = {}

    const res = await UtilMiddleware.noop(ctx, next)

    expect(res).to.be.eq('next1')
    expect(next.calledOnce).to.be.true
  })

  it('Should handle body parser error when too large', () => {
    const error: any = new Error('fake-error')
    error.type = 'entity.too.large'

    expect(() => UtilMiddleware.onBodyParserError(error)).to.throw('entity_too_large')
  })

  it('Should handle body parser error when unknown error', () => {
    const error = new Error('fake-error')

    expect(() => UtilMiddleware.onBodyParserError(error)).to.throw('bad_params')
  })
})
