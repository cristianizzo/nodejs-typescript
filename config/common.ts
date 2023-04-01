import utils from '../src/helpers/utils';
import {IConfigInterface} from '../src/types/config/config';

const getConfigObject = (sourceConfig: Record<string, any>): IConfigInterface => {
  return {
    APP_NAME: utils.configParser(sourceConfig, 'string', 'APP_NAME', 'BaseProject'),
    ENVIRONMENT: utils.configParser(sourceConfig, 'string', 'ENVIRONMENT', 'local'),
    NODE_ENV: utils.configParser(sourceConfig, 'string', 'NODE_ENV', 'development'),
    TIMEZONE: utils.configParser(sourceConfig, 'string', 'TIMEZONE', 'Europe/London'),
    REMOTE_EXECUTION: utils.configParser(sourceConfig, 'bool', 'REMOTE_EXECUTION', false),
    PROXY: utils.configParser(sourceConfig, 'string', 'PROXY', null),
    ALLOW_SIGNUP: utils.configParser(sourceConfig, 'bool', 'ALLOW_SIGNUP', true),
    DEMO_ACCOUNT: utils.configParser(sourceConfig, 'string', 'DEMO_ACCOUNT', 'dev@test.com'),
    CIPHER_PASSWORD: utils.configParser(sourceConfig, 'string', 'CIPHER_PASSWORD', '1234567890abcdefghijklmnopqrstuv'),
    CIPHER_2FA: utils.configParser(sourceConfig, 'string', 'CIPHER_2FA', '18qh3yav41mjkzv21gfddx0vjrrm86mv'),
    JWT_SECRET: utils.configParser(sourceConfig, 'string', 'JWT_SECRET', 'tamereenstring'),
    DEEPLINK_APP: utils.configParser(sourceConfig, 'string', 'DEEPLINK_APP', null),

    DATABASE: {
      URI: utils.configParser(sourceConfig, 'string', 'DATABASE_URI', 'postgres://postgres:password@localhost:5432/test'),
      SSL: utils.configParser(sourceConfig, 'bool', 'DATABASE_SSL', false),
      MAX_CONNECTION: utils.configParser(sourceConfig, 'number', 'DATABASE_MAX_CONNECTION', 50),
      RETRY_CONCURRENT_TIME: utils.configParser(sourceConfig, 'number', 'DATABASE_RETRY_CONCURRENT_TIME', 100),
    },

    AWS_MANAGER: {
      STATUS: utils.configParser(sourceConfig, 'bool', 'AWS_MANAGER_STATUS', false),
      REGION: utils.configParser(sourceConfig, 'string', 'AWS_MANAGER_REGION', 'eu-central-1'),
      USE_DB_CREDENTIALS: utils.configParser(sourceConfig, 'bool', 'AWS_MANAGER_USE_DB_CREDENTIALS', false), // use db credentials from aws
      AWS_KEY: utils.configParser(sourceConfig, 'string', 'AWS_MANAGER_AWS_KEY', 'tf_postgres_credentials'),
    },

    COGNITO: {
      JWK: utils.configParser(sourceConfig, 'string', 'COGNITO_JWK', 'tf_jwk'),
      CONFIG_KEY: utils.configParser(sourceConfig, 'string', 'COGNITO_CONFIG_KEY', 'tf_cognito_config'),
    },

    LOG: {
      LEVEL: utils.configParser(sourceConfig, 'string', 'LOG_LEVEL', 'verbose'),
      SENTRY_DSN: utils.configParser(sourceConfig, 'string', 'LOG_SENTRY_DSN', null),
      LOGZIO_KEY: utils.configParser(sourceConfig, 'string', 'LOG_LOGZIO_KEY', null),
      LOGZIO_HOST: utils.configParser(sourceConfig, 'string', 'LOG_LOGZIO_HOST', null),
      LOGZIO_SERVER_NAME: utils.configParser(sourceConfig, 'string', 'LOG_LOGZIO_SERVER_NAME', 'backend'),
    },

    ELASTIC: {
      APM_STATUS: utils.configParser(sourceConfig, 'bool', 'ELASTIC_APM_STATUS', false),
      APM_SECRET_TOKEN: utils.configParser(sourceConfig, 'string', 'ELASTIC_APM_SECRET_TOKEN', null),
      APM_SERVER_URL: utils.configParser(sourceConfig, 'string', 'ELASTIC_APM_SERVER_URL', null),
      APM_DOMAIN: utils.configParser(sourceConfig, 'string', 'ELASTIC_APM_DOMAIN', null),
    },

    MAIL: {
      REPLY_EMAIL: utils.configParser(sourceConfig, 'string', 'MAIL_REPLY_EMAIL', 'noreply@test.com'),
      FROM_EMAIL: utils.configParser(sourceConfig, 'string', 'MAIL_FROM_EMAIL', 'noreply@test.com'),
      SENDGRID_URI: utils.configParser(sourceConfig, 'string', 'MAIL_SENDGRID_URL', 'https://api.sendgrid.com/v3/mail/send'),
      SENDGRID_API_KEY: utils.configParser(sourceConfig, 'string', 'MAIL_SENDGRID_API_KEY', null),
    },

    SERVICES: {
      API: {
        NAME: utils.configParser(sourceConfig, 'string', 'SERVICES_API_NAME', 'API'),
        PORT: utils.configParser(sourceConfig, 'number', 'SERVICES_API_PORT', 3000),
        TIMEOUT: utils.configParser(sourceConfig, 'number', 'SERVICES_API_TIMEOUT', 30), // in second
        CORS: utils.configParser(sourceConfig, 'array', 'SERVICES_API_CORS_ORIGIN', []),
        SESSION_EXPIRATION_DAY: utils.configParser(sourceConfig, 'number', 'SERVICES_API_SESSION_EXPIRATION', 7), // in day
        MAIL_PIN_EXPIRATION: utils.configParser(sourceConfig, 'number', 'SERVICES_API_MAIL_PIN_EXPIRATION', 5), // in minutes
        LOGIN_RETRY_ATTEMPTS: utils.configParser(sourceConfig, 'number', 'SERVICES_API_LOGIN_RETRY_ATTEMPTS', 10),
        MAIL_RESET_PASSWORD_EXPIRATION: utils.configParser(sourceConfig, 'number', 'SERVICES_API_MAIL_RESET_PASSWORD_EXPIRATION', 12), // in hour},
      },
    }
  };
}

export {
  getConfigObject
};
