import * as fs from 'fs';
import { Model, Mongoose } from 'mongoose';

interface SchemaMap {
  [name: string]: Model<any>;
}

export default function loadSchemas(mongoose: Mongoose): SchemaMap {
  const schemas: SchemaMap = {};

  fs.readdirSync(`${__dirname}/schema/`).forEach((filename) => {
    if (/\.js|\.ts$/.test(filename)) {
      try {
        const name = filename.split('.')[0];
        schemas[name] = require(`${__dirname}/schema/${filename}`).default(mongoose);
      } catch (e) {
        // already compiled
      }
    }
  });

  return schemas;
}
