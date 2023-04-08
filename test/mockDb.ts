import { Sequelize } from 'sequelize'
import Postgres from '@modules/postgres'
import { setModels } from '@models/postgres/utils/setModels'

Postgres.sequelize = new Sequelize({
  dialect: 'sqlite',
  logging: console.log.bind(console, 'sequelize:')
})
setModels(Postgres.sequelize)
