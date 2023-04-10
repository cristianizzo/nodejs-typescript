import * as fs from 'fs'
import create from './create'
import Migrate from './migrate'
import Postgres from '../../../modules/postgres'
import PSQL from './psql'
import logger from '@logger'

const llo = logger.logMeta.bind(null, { service: 'postgres-compare' })

function compareWithoutInsert(a: any, b: any) {
  function filterInsert(t: any) {
    const l = t.split('\n')
    const f = l.filter((o: any) => o.indexOf('INSERT') !== 0)
    return f.join('')
  }

  const af = filterInsert(a)
  const bf = filterInsert(b)

  return af === bf
}

const init = async () => {
  try {
    // with create
    try {
      PSQL.dropdb()
    } catch (e) {
      logger.info('no existing db to drop', llo({}))
    }
    PSQL.createdb()

    await Postgres.connect()
    await create()
    await Postgres.disconnect()
    const dumpCreate = PSQL.dump()
    fs.writeFileSync('./dumpCreate.sql', dumpCreate)

    // with migrate
    PSQL.dropdb()
    PSQL.createdb()

    await Postgres.connect()
    Migrate.SetSequelize(Postgres.sequelize)
    await Migrate.Migrate()
    const dumpMigrate = PSQL.dump()
    fs.writeFileSync('./dumpMigrate.sql', dumpMigrate)

    logger.info(dumpCreate.length, llo({}))
    logger.info(dumpMigrate.length, llo({}))
    logger.info('equals:', llo({ value: dumpMigrate === dumpCreate }))
    logger.info(
      'equals without insert',
      llo({
        compareWithoutInsert: compareWithoutInsert(dumpMigrate, dumpCreate)
      })
    )

    logger.info(dumpCreate.length, llo({}))

    logger.info('done', llo({}))
    process.exit(0) // eslint-disable-line no-process-exit
  } finally {
    await Postgres.disconnect()
  }
}

init().catch(console.error) // eslint-disable-line no-console
