import * as sinon from 'sinon'
import * as Router from '@koa/router'
import { expect } from 'chai'
import MainRouter from '@api-user/v1/routers/index'
import UsersRouter from '@api-user/v1/routers/users'
import StatusRouter from '@api-user/v1/routers/status'
import utils from '@helpers/utils'

describe('Router: MainRouter', () => {
  let sandbox: any = null

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox?.restore()
  })

  it('Should get main router', async () => {
    const use = sandbox.stub(Router.prototype, 'use')

    function stubRouter(Rt, name) {
      return sandbox.stub(Rt, 'router').returns({
        routes: sandbox.stub().returns(`${name}Routes`),
        allowedMethods: sandbox.stub().returns(`${name}AllowedMethod`)
      })
    }

    stubRouter(UsersRouter, 'user')
    stubRouter(StatusRouter, 'status')

    await utils.wait(1000)

    const mainRouter = MainRouter.router()
    expect(mainRouter instanceof Router).to.be.true

    expect(use.callCount).to.be.eq(2)
    expect(use.calledWith(`statusRoutes`, `statusAllowedMethod`)).to.be.true

    function expectRouter(name) {
      expect(use.calledWith(`/${name}`, `${name}Routes`, `${name}AllowedMethod`)).to.be.true
    }

    expectRouter('user')
  })
})
