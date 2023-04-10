import * as sinon from 'sinon'
import Monitoring from '@helpers/monitoring'
import logger from '@modules/logger'
import { expect } from 'chai'

function tightWork(duration: number) {
  const start = Date.now()
  while (Date.now() - start < duration) {
    for (let i = 0; i < 1e5; ) i++
  }
}

describe('Module: Monitoring', () => {
  let sandbox: any = null

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    Monitoring.toobusy.maxLag(10)
    Monitoring.toobusy.interval(50)
  })

  after(function () {
    Monitoring.toobusy.maxLag(70)
    Monitoring.toobusy.interval(500)
    sandbox?.restore()
  })

  it.skip('logs if too much work', (done) => {
    const warn = sandbox.stub(logger, 'warn')

    function load() {
      if (warn.callCount > 0) {
        expect(warn.args[0][0]).to.eq('too_busy')
        done()
        return
      }
      tightWork(100)
      setTimeout(load, 0)
    }

    load()
  })
})
