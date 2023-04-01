import NodeRSA from 'node-rsa';
import bcrypt from 'bcrypt';
import CryptoJS from 'crypto-js';
import config from '../../config';
import {throwError} from './errors';

const Crypto = {
  SALT_ROUNDS: 8,

  bcrypt: {
    async hash(text: string): Promise<string> {
      const salt = await bcrypt.genSalt(Crypto.SALT_ROUNDS);
      return bcrypt.hash(text, salt);
    },

    async verifyHash(text: string, hash: string): Promise<boolean> {
      return bcrypt.compare(text, hash);
    },

    getHashRounds(hash: string): number {
      return bcrypt.getRounds(hash);
    },
  },

  sha: {
    hash(str: string): string {
      return CryptoJS.algo.SHA256.create().update(str).finalize().toString();
    },

    verifySha1(str: string, key: string, digest: string): boolean {
      const calculatedDigest = CryptoJS.HmacSHA1(str, key).toString();

      return calculatedDigest === digest;
    },
  },

  getRandom32(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  },

  encrypt(str: string, key: string = config.CIPHER_PASSWORD): string | undefined {
    try {
      const IV = CryptoJS.lib.WordArray.random(16);

      const cipher = CryptoJS.AES.encrypt(str, key, {
        iv: IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      return IV.toString() + '$' + cipher.toString();

    } catch (error) {
      throwError('crypto_error', {error});
    }
  },

  decrypt(str: string, key: string = config.CIPHER_PASSWORD): string | undefined {
    try {
      const arr = str.split('$');

      const IV = CryptoJS.enc.Hex.parse(arr[0]);
      const cipher = CryptoJS.enc.Hex.parse(arr[1]);

      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: cipher,
      });

      const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
        iv: IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }).toString(CryptoJS.enc.Utf8);

      return decrypted;

    } catch (error) {
      throwError('crypto_error', {error});
    }
  },

  rsa: {
    encrypt(str: string, publicKey: string): string {
      const pubKey = new NodeRSA(publicKey, 'public');
      return pubKey.encrypt(str, 'base64');
    },

    decrypt(str: string, privateKey: string): string {
      const privKey: any = new NodeRSA(privateKey);
      return privKey.decrypt(str, 'utf8');
    },
  },
};

export default Crypto;
