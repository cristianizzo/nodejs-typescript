// TODO:
import AwsManager from './secretManager'

// POSTGRES_CREDENTIALS: 'tf_postgres_credentials',
const secrets: any = {
  CLOUDFRONT_SIGN_ID: 'tf_content_cloudfront_sign_id',
  CLOUDFRONT_PRIVATE_KEY: 'tf_content_cloudfront_sign_key',
  SENDGRID: 'tf_sendgrid_apikey',
  SOLANA_KEYPAIR: 'tf_agreewe_solana_keypair',
  ETHEREUM_PRIVATEKEY: 'tf_agreewe_ethereum_privatekey',
  ABLY_BACKEND_API_KEY: 'tf_ably_backend_apikey',
  EMAIL_WHITELIST_GOOGLESHEET: 'tf_google_sheets_email_whitelist',
  COGNITO_JWK: 'tf_jwk',
  COGNITO_CONFIG_KEY: 'tf_cognito_config'
}

export default new Promise(async (resolve, reject) => {
  const aws = new AwsManager()

  // const env = dotenv.config().parsed;
  // console.log(env);
  // const env = {};
  for (const secretName in secrets) {
    const secretKey = secrets[secretName]
    const secret = await aws.getSecret(secretKey)
    console.log(secretKey, secret)
    //
    // console.log(secret)
    // env[key] = secrets[key];
  }
})
