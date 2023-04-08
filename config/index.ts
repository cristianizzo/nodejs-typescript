import * as dotenv from 'dotenv'
import { IConfigInterface } from '@type/config/config'
import { getConfigObject } from './common'

dotenv.config()

const config: IConfigInterface = getConfigObject(process.env)

export default config
