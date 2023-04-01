import {GetSecretValueCommand, SecretsManagerClient} from '@aws-sdk/client-secrets-manager'
import config from '../../config';
import logger from "../modules/logger";

const llo = logger.logMeta.bind(null, {service: 'awsSecretManager'})

class AwsSecretManager {
  private readonly client: SecretsManagerClient;

  constructor() {
    this.client = new SecretsManagerClient({region: config.AWS_MANAGER.REGION});
  }

  public async getSecret(secretId: string): Promise<any> {
    try {
      const result = await this.client.send(new GetSecretValueCommand({SecretId: secretId}))
      if (result.SecretString) {
        try {
          return JSON.parse(result.SecretString)
        } catch (e: any) {
          return result.SecretString as any
        }
      }
    } catch (error: any) {
      logger.error('Unexpected API error', llo({error, secretId}));
      throw error;
    }
  }
}

export default AwsSecretManager;
