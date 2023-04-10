import * as NodeRSA from 'node-rsa'
import * as bcrypt from 'bcrypt'
import config from '@config'
import { throwError } from '@errors'
import * as crypto from 'crypto'

const CIPHER_ALGORYTHM = 'aes-256-cbc'

const Crypto = {
  SALT_ROUNDS: 8,

  bcrypt: {
    async hash(text: string): Promise<string> {
      const salt = await bcrypt.genSalt(Crypto.SALT_ROUNDS)
      return await bcrypt.hash(text, salt)
    },

    async verifyHash(text: string, hash: string): Promise<boolean> {
      return await bcrypt.compare(text, hash)
    },

    async getHashRounds(hash: string): Promise<number> {
      return bcrypt.getRounds(hash)
    }
  },

  sha: {
    hash(str: string, algo = 'sha256'): string {
      const hash = crypto.createHash(algo)
      hash.update(str)
      return hash.digest('hex')
    },

    verifySh1(str: string, key: string, digest: string): boolean {
      const calculatedDigest = crypto.createHmac('sha1', key).update(str).digest('hex')

      return calculatedDigest === digest
    }
  },

  encrypt(str: string, key: any = config.CIPHER_PASSWORD): string {
    try {
      const IV = Buffer.from(crypto.randomBytes(16))

      const cipher = crypto.createCipheriv(CIPHER_ALGORYTHM, key, IV)

      let cipherText = cipher.update(str, 'utf8', 'hex')
      cipherText += cipher.final('hex')

      return IV.toString('hex') + '$' + cipherText
    } catch (error) {
      return throwError('crypto_error', { error })
    }
  },

  decrypt(str: string, key: any = config.CIPHER_PASSWORD): string {
    try {
      const arr = str.split('$')

      const IV = Buffer.from(arr[0], 'hex')

      const decipher = crypto.createDecipheriv(CIPHER_ALGORYTHM, key, IV)

      let decrypted = decipher.update(arr[1], 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      return throwError('crypto_error', { error })
    }
  },

  rsa: {
    encrypt(str: string, publicKey: string): string {
      const pubKey = new NodeRSA(publicKey)
      return pubKey.encrypt(str, 'base64')
    },

    decrypt(str: string, privateKey: string): string {
      const privKey = new NodeRSA(privateKey)
      return privKey.decrypt(str, 'utf8')
    }
  }
}

export default Crypto
