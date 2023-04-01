export enum IEnumEnvironment {
  prod = 'prod',
  qa = 'qa',
  dev = 'dev',
  local = 'local',
}

export enum IEnumNodeEnv {
  development = 'development',
  production = 'production'
}

export interface IConfigInterface {
  APP_NAME: string;
  ENVIRONMENT: IEnumEnvironment;
  NODE_ENV: IEnumNodeEnv;
  TIMEZONE: string;
  REMOTE_EXECUTION: boolean;
  PROXY: string | null;
  ALLOW_SIGNUP: boolean;
  DEMO_ACCOUNT: string;
  CIPHER_PASSWORD: string;
  CIPHER_2FA: string;
  JWT_SECRET: string;
  DEEPLINK_APP: string;
  DATABASE: {
    URI: string;
    SSL: boolean;
    MAX_CONNECTION: number;
    RETRY_CONCURRENT_TIME: number;
  }
  AWS_MANAGER: {
    STATUS: boolean;
    REGION: string;
    USE_DB_CREDENTIALS: boolean;
    AWS_KEY: string;
  }
  COGNITO: {
    JWK: string;
    CONFIG_KEY: string;
  }
  LOG: {
    LEVEL: string;
    SENTRY_DSN: string;
    LOGZIO_HOST: string;
    LOGZIO_KEY: string;
    LOGZIO_SERVER_NAME: string;
  },
  ELASTIC: {
    APM_STATUS: boolean;
    APM_SECRET_TOKEN: string;
    APM_SERVER_URL: string;
    APM_DOMAIN: string;
  },
  MAIL: {
    REPLY_EMAIL: string;
    FROM_EMAIL: string;
    SENDGRID_URI: string;
    SENDGRID_API_KEY: string;
  }
  SERVICES: {
    API: {
      NAME: string;
      PORT: number;
      TIMEOUT: number;
      CORS: string[];
      SESSION_EXPIRATION_DAY: number;
      MAIL_PIN_EXPIRATION: number;
      LOGIN_RETRY_ATTEMPTS: number;
      MAIL_RESET_PASSWORD_EXPIRATION: number;
    }
  }
}
