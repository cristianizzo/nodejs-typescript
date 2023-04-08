import * as sinon from 'sinon'
import ExternalLogger from '@modules/logger/external'
import Formats from '@modules/logger/format'
import config from '@config'
import { expect } from 'chai'
import * as logNodejs from 'logzio-nodejs'
import * as sentry from '@sentry/node'

const sentryInitOriginal = sentry.init

describe('Module: ExternalLogger', () => {
  let sandbox: any = null
  let oldConfigSentryDSN: any
  let mockSentry: any
  let stubSentryInit: any
  let externalLogger: any

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  after(() => {
    sandbox?.restore()
  })

  describe('Log', () => {
    it('Should instantiate', () => {
      const externalLogger: any = new ExternalLogger({
        name: 'external-logger',
        level: 'verbose'
      })

      expect(externalLogger.logzioLogger).not.to.exist
      expect(externalLogger.logzioLogger).not.to.exist
    })

    it('Should log', () => {
      const externalLogger = new ExternalLogger({
        name: 'external-logger',
        level: 'verbose'
      })

      const spyFormatMeta = sandbox.spy(Formats, 'formatMeta')
      const stubCallback = sandbox.stub()

      externalLogger.log({ p: 'p1' }, stubCallback)

      expect(spyFormatMeta.calledOnce).to.be.true
      expect(spyFormatMeta.calledWith({ p: 'p1' })).to.be.true
      expect(stubCallback.calledOnce).to.be.true
    })

    it('Should log with logzio', () => {
      const oldConfigLogzioServerName = config.LOG.LOGZIO_SERVER_NAME
      const oldConfigLogzioKey = config.LOG.LOGZIO_KEY
      const oldConfigLogzioHost = config.LOG.LOGZIO_HOST
      config.LOG.LOGZIO_KEY = 'logzio-key'
      config.LOG.LOGZIO_SERVER_NAME = 'backend'
      config.LOG.LOGZIO_HOST = 'listener.logz.io'

      const mockLogzio = {
        log: sandbox.stub()
      }

      const stubLogzioCreateLogger = sandbox.stub(logNodejs, 'createLogger').returns(mockLogzio)

      const externalLogger: any = new ExternalLogger({
        name: 'external-logger',
        level: 'verbose'
      })

      expect(stubLogzioCreateLogger.calledOnce).to.be.true
      expect(
        stubLogzioCreateLogger.calledWith({
          token: 'logzio-key',
          host: 'listener.logz.io',
          type: config.LOG.LOGZIO_SERVER_NAME,
          protocol: 'https'
        })
      ).to.be.true
      expect(externalLogger.logzioLogger).to.eq(mockLogzio)
      config.LOG.LOGZIO_KEY = oldConfigLogzioKey
      config.LOG.LOGZIO_SERVER_NAME = oldConfigLogzioServerName
      config.LOG.LOGZIO_HOST = oldConfigLogzioHost

      const stubCallback = sandbox.stub()
      externalLogger.log(
        {
          level: 'info',
          machine: 'machine1',
          message: 'message1',
          p: 'p1'
        },
        stubCallback
      )

      expect(mockLogzio.log.calledOnce).to.be.true
      expect(
        mockLogzio.log.calledWith({
          level: 'info',
          machine: 'machine1',
          message: 'message1',
          meta: { p: 'p1' }
        })
      ).to.be.true
    })

    describe('Sentry', () => {
      let stubCallback: any
      beforeEach(() => {
        oldConfigSentryDSN = config.LOG.SENTRY_DSN
        config.LOG.SENTRY_DSN = 'sentry-dsn'

        mockSentry = {
          setExtra: sandbox.stub(),
          captureMessage: sandbox.stub()
        }

        stubSentryInit = sentry.init === sentryInitOriginal ? sandbox.stub(sentry, 'init').returns(mockSentry) : sentry.init

        externalLogger = new ExternalLogger({
          name: 'external-logger',
          level: 'verbose'
        })
        externalLogger.sentry.setExtra = mockSentry.setExtra
        externalLogger.sentry.captureMessage = mockSentry.captureMessage

        stubCallback = sandbox.stub()
      })

      afterEach(() => {
        config.LOG.SENTRY_DSN = oldConfigSentryDSN
      })

      it('Should not log with sentry no error message', () => {
        expect(stubSentryInit.calledOnce).to.be.true
        expect(
          stubSentryInit.calledWith({
            dsn: 'sentry-dsn',
            serverName: config.LOG.LOGZIO_SERVER_NAME,
            environment: config.ENVIRONMENT
          })
        ).to.be.true
        expect(externalLogger.sentry).to.exist

        externalLogger.log(
          {
            level: 'info',
            machine: 'machine1',
            message: 'message1',
            p: 'p1'
          },
          stubCallback
        )

        expect(mockSentry.setExtra.callCount).to.eq(0)
        expect(mockSentry.captureMessage.callCount).to.eq(0)
        expect(stubCallback.calledOnce).to.be.true
      })

      it('Should not log with sentry error exposed message', () => {
        const error: any = new Error('fake-error1')
        error.exposeCustom_ = true

        externalLogger.log(
          {
            level: 'error',
            machine: 'machine1',
            message: 'message1',
            tags: ['tag1'],
            error,
            p: 'p1'
          },
          stubCallback
        )

        expect(mockSentry.setExtra.callCount).to.eq(0)
        expect(mockSentry.captureMessage.callCount).to.eq(0)
        expect(stubCallback.calledOnce).to.be.true
      })

      it('Should log with sentry error', () => {
        const log = {
          level: 'error',
          machine: 'machine1',
          message: 'message1',
          tags: ['tag1'],
          error: new Error('fake-error1'),
          p: 'p1'
        }

        externalLogger.log(log, stubCallback)

        expect(mockSentry.setExtra.calledOnce).to.be.true
        expect(mockSentry.setExtra.args[0][0]).to.eq('info')
        expect(mockSentry.setExtra.args[0][1]).to.be.deep.eq(log)

        expect(mockSentry.captureMessage.calledOnce).to.be.true
        expect(mockSentry.captureMessage.args[0][0].message).to.eq('message1 - fake-error1')
        expect(stubCallback.calledOnce).to.be.true
      })

      it('Should log with sentry error with user', () => {
        const log = {
          level: 'error',
          machine: 'machine1',
          message: 'message1',
          tags: ['tag1'],
          error: new Error('fake-error1'),
          p: 'p1',
          userId: 'userId1'
        }

        externalLogger.log(log, stubCallback)

        expect(mockSentry.setExtra.calledOnce).to.be.true
        expect(mockSentry.setExtra.args[0][0]).to.eq('info')
        expect(mockSentry.setExtra.args[0][1]).to.be.deep.eq(log)

        expect(mockSentry.captureMessage.calledOnce).to.be.true
        expect(mockSentry.captureMessage.args[0][0].message).to.eq('message1 - fake-error1')
        expect(stubCallback.calledOnce).to.be.true
      })
    })
  })

  describe('Purge', () => {
    beforeEach(() => {
      externalLogger = new ExternalLogger({
        name: 'external-logger',
        level: 'verbose'
      })
    })

    it('Should purge', () => {
      expect(externalLogger.purge()).to.be.true
    })

    it('Should purge with logzio', () => {
      externalLogger.logzioLogger = {
        sendAndClose: sandbox.stub()
      }

      expect(externalLogger.purge()).to.be.true

      expect(externalLogger.logzioLogger.sendAndClose.calledOnce).to.be.true
    })

    it('Should purge sentry', () => {
      externalLogger.sentry = {
        close: sandbox.stub()
      }

      expect(externalLogger.purge()).to.be.true

      expect(externalLogger.sentry.close.calledOnce).to.be.true
    })
  })
})
