import * as Transport from 'winston-transport';
import * as logNodejs from 'logzio-nodejs';
import * as Sentry from '@sentry/node';
import Format from '@modules/logger/format';
import config from '@config';

interface ExternalLoggerOptions extends Transport.TransportStreamOptions {
  name?: string;
  level?: string;
}

class ExternalLogger extends Transport {
  private readonly logzioLogger?: any;
  private readonly sentry?: typeof Sentry;

  constructor(opts?: ExternalLoggerOptions) {
    super(opts);

    if (config.LOG.LOGZIO_KEY) {
      this.logzioLogger = logNodejs.createLogger({
        token: config.LOG.LOGZIO_KEY,
        host: config.LOG.LOGZIO_HOST,
        type: config.LOG.LOGZIO_SERVER_NAME,
        protocol: 'https'
      });
    }

    if (config.LOG.SENTRY_DSN) {
      this.sentry = Sentry;
      this.sentry.init({
        dsn: config.LOG.SENTRY_DSN,
        serverName: config.LOG.LOGZIO_SERVER_NAME,
        environment: config.ENVIRONMENT
      });
    }
  }

  end(...args: any[]): any {
    return super.end(...args);
  }

  log(info: any, callback: () => void) {
    const msg = Format.formatMeta(info);

    if (this.logzioLogger) {
      this.logzioLogger.log(msg);
    }

    if (info.level === 'error' && this.sentry && info.error instanceof Error && !info.error.exposeCustom_) {
      info.error.message = `${info.message} - ${info.error.message}`;
      this.sentry.setExtra('info', info);
      this.sentry.captureMessage(info.error);
    }

    callback();
  }

  purge() {
    if (this.logzioLogger) {
      this.logzioLogger.sendAndClose();
    }

    if (this.sentry) {
      this.sentry.close();
    }

    return true;
  }
}

export default ExternalLogger;
