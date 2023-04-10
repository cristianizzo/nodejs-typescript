import logger from '@logger'
import Postgres from '@modules/postgres'
import Models from '@postgresModels'
import Utils from '@helpers/utils'
import * as UserJson from '../initialData/user.json'
import * as UserRoleJson from '../initialData/userRole.json'
import * as UserNotificationJson from '../initialData/userNotification.json'

const llo = logger.logMeta.bind(null, { service: 'postgres-create' })

async function create() {
  if (!Postgres.sequelize) {
    await Postgres.connect()
    logger.info('Connection has been established successfully', llo({}))
  }

  const modelsName = Object.keys(Models)

  logger.info('Create models', llo({ modelsName }))

  await Postgres.sequelize.query(['CREATE EXTENSION IF NOT EXISTS "uuid-ossp"', 'CREATE EXTENSION IF NOT EXISTS "hstore"'].join(';'))

  await Postgres.sequelize.sync({ force: true })

  logger.info('Populating database', llo({}))

  await populateTable(UserRoleJson, Models.UserRole)
  await populateTable(UserJson, Models.User)
  await populateTable(UserNotificationJson, Models.UserNotification)
}

async function populateTable(objects: any, model: any) {
  return await Utils.asyncForEach(objects, (object: any) => {
    model.create(object.data)
  })
}

export default create
