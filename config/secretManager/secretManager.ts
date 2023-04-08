import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import config from '@config'

interface IDatabaseCredentials {
  password: string;
  user?: string;
  engine: string;
  host: string;
  port: number;
  database: string;
}

class SecretManager {
  private readonly client: SecretsManagerClient

  constructor() {
    this.client = new SecretsManagerClient({ region: config.AWS_MANAGER.REGION })
  }

  public async getSecret(secretId: string): Promise<any> {
    try {
      const result = await this.client.send(new GetSecretValueCommand({ SecretId: secretId }))
      if (result.SecretString) {
        try {
          return JSON.parse(result.SecretString)
        } catch (e: any) {
          return result.SecretString as any
        }
      }
    } catch (error: any) {
      throw error
    }
  }

  public async getDbUri(): Promise<string> {
    const dbConfig = await this.getSecret(config.AWS_MANAGER.AWS_KEY)
    return this.parseCredentials(dbConfig)
  }

  private parseCredentials({ user, password, engine, host, port, database }: IDatabaseCredentials): string {
    return `${engine}://${user}:${password}@${host}:${port}/${database}`
  }

  // private async configureCognitoCredentials() {
  //   // const jwkConfig = await this.getSecret<JWKConfig>(config.COGNITO.JWK);
  //   // const cognitoConfig = await this.getSecret<CognitoConfig>(config.COGNITO.CONFIG_KEY);
  //   //
  //   // const cognito = injectedServices.cognito ?? new CognitoService(config.awsRegion, cognitoConfig, logger)
  // }
}

export default SecretManager
