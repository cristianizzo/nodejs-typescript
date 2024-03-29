import * as sinon from 'sinon'
import { expect } from 'chai'
import ErrorMiddleware from '@api-user/v1/middlewares/error'

describe('Middleware: Error', () => {
  let sandbox: any = null

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox && sandbox.restore()
  })

  it('run', async () => {
    const next = sinon.stub()
    const ctx: any = {}

    await ErrorMiddleware()(ctx, next)

    expect(next.calledWith()).to.be.true
  })

  it('catch', async () => {
    const error = new Error('fake-error')
    const next = sinon.stub().rejects(error)
    const ctx: any = { requestInfo: { p1: 'p11' } }

    await ErrorMiddleware()(ctx, next)

    expect(next.calledWith()).to.be.true
    expect(ctx.status).to.eq(500)
    expect(ctx.body).to.deep.eq({
      code: 'unknown_error',
      description: 'Internal server error'
    })
    expect(ctx.requestInfo.error).to.be.eq(error)
  })

  it('Should catch without request info', async () => {
    const error = new Error('fake-error')
    const next = sinon.stub().rejects(error)
    const ctx: any = {}

    await ErrorMiddleware()(ctx, next)

    expect(next.calledWith()).to.be.true
    expect(ctx.status).to.eq(500)
    expect(ctx.body).to.deep.eq({
      code: 'unknown_error',
      description: 'Internal server error'
    })
    expect(ctx.requestInfo.error).to.be.eq(error)
  })

  it('catch with custom', async () => {
    const error: any = new Error('coucou')
    error.exposeCustom_ = true
    error.status = 100
    error.description = 'desc'
    error.exposeMeta = 'meta'
    const next = sinon.stub().rejects(error)
    const ctx: any = { requestInfo: { p1: 'p11' } }

    await ErrorMiddleware()(ctx, next)

    expect(next.calledWith()).to.be.true

    expect(ctx.status).to.eq(100)
    expect(ctx.body).to.deep.eq({
      code: 'coucou',
      description: 'desc',
      meta: 'meta'
    })
    expect(ctx.requestInfo.error).to.be.eq(error)
  })
})
