import * as path from 'path'
import * as fs from 'fs'
import { Model, Mongoose } from 'mongoose'

type SchemaMap = Record<string, Model<any>>

export default function loadSchemas(mongoose: Mongoose): SchemaMap {
  const schemas: SchemaMap = {}

  fs.readdirSync(path.join(__dirname, 'schema')).forEach((filename) => {
    if (/\.js|\.ts$/.test(filename)) {
      try {
        const name = filename.split('.')[0]
        // eslint-disable-next-line
        schemas[name] = require(path.join(__dirname, 'schema', filename)).default(mongoose)
      } catch (e) {
        // already compiled
      }
    }
  })

  return schemas
}
