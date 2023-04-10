import * as _jsonwebtoken from 'jsonwebtoken'
import { DecodeOptions, sign as signType, verify as verifyType } from 'jsonwebtoken'

const jsonwebtoken = _jsonwebtoken as any

interface ExtendedDecodeOptions extends DecodeOptions {
  complete?: boolean
}

const sign: typeof signType = jsonwebtoken.sign
const verify: typeof verifyType = jsonwebtoken.verify

const decode = (token: string, options?: ExtendedDecodeOptions | string) => {
  return jsonwebtoken.decode(token, options)
}

export { sign, verify, decode }
