import * as sinon from 'sinon'
import logger from '@modules/logger'
import { expect } from 'chai'

describe('Module: Logger', () => {
  let sandbox: any = null

  beforeEach(function () {
    sandbox = sinon.createSandbox()
  })

  after(function () {
    sandbox?.restore()
  })

  it('logMeta', () => {
    const llo = logger.logMeta.bind(null, null, { a: 1 }, { b: 2 })

    const logInfo = llo({ c: 3 })

    expect(logInfo).to.deep.eq({
      a: 1,
      b: 2,
      c: 3
    })
  })
})
