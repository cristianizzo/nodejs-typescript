import { SequelizeStorage, Umzug } from 'umzug'
import Postgres from '@modules/postgres'
import utils from '@helpers/utils'
import logger from '@logger'
import PSQL from './psql'
import { Sequelize } from 'sequelize'

const llo = logger.logMeta.bind(null, { service: 'postgres:migration' })

function logUmzugEvent(eventName: string) {
  return function ({ name }: { name: string }) {
    console.log(`${name} ${eventName}`) // eslint-disable-line no-console
  }
}

// https://github.com/abelnation/sequelize-migration-hello

const Migrate = {
  umzug: null as Umzug | null,

  SetSequelize: (sequelize: Sequelize): void => {
    if (Migrate.umzug != null) {
      ;(Migrate.umzug as any).removeAllListeners() // eslint-disable-line
    }

    const parent: any = new Umzug({
      logger: undefined,
      storage: new SequelizeStorage({ sequelize }),
      context: sequelize.getQueryInterface(),
      migrations: {
        glob: './src/models/pg/migrations/*.ts',
        resolve: ({ name, path, context }) => {
          const migration: { up: any; down: any } = require(path as string) // eslint-disable-line

          return {
            name,
            up: async () =>
              await Postgres.executeTxFn(async ({ transaction }: any) => {
                await migration.up(context, transaction)
                await transaction.commit()
              }),
            down: async () =>
              await Postgres.executeTxFn(async ({ transaction }: any) => {
                await migration.down(context, transaction)
                await transaction.commit()
              })
          }
        }
      }
    })

    Migrate.umzug = new Umzug({
      ...parent.options,
      migrations: async () =>
        (await parent.migrations()).sort((a: any, b: any) => {
          const aVersion = /(\d*).*/.exec(a.name)![1] // eslint-disable-line
          const bVersion = /(\d*).*/.exec(b.name)![1] // eslint-disable-line
          return parseInt(aVersion, 10) > parseInt(bVersion, 10) ? 1 : -1
        })
    })

    Migrate.umzug.on('migrating', logUmzugEvent('migrating'))
    Migrate.umzug.on('migrated', logUmzugEvent('migrated'))
    Migrate.umzug.on('reverting', logUmzugEvent('reverting'))
    Migrate.umzug.on('reverted', logUmzugEvent('reverted'))
  },

  Status() {
    const result: any = {}

    return (Migrate.umzug as any)
      .executed()
      .then((executed: any) => {
        result.executed = executed
        return (Migrate.umzug as any).pending()
      })
      .then((pending: any) => {
        result.pending = pending
        return result
      })
      .then(({ executed, pending }: any) => {
        const current = executed.length > 0 ? executed[executed.length - 1].name : '<NO_MIGRATIONS>'
        const status = {
          current,
          executed: executed.map((m: any) => m.name),
          pending: pending.map((m: any) => m.name)
        }

        logger.info('status', llo(status))

        return { executed, pending }
      })
  },

  Migrate() {
    return (Migrate.umzug as any).up()
  },

  MigrateNext() {
    return Migrate.Status().then(({ pending }: any) => {
      if (pending.length === 0) {
        throw new Error('No pending migrations')
      }
      const next = pending[0].name
      return (Migrate.umzug as any).up({ to: next })
    })
  },

  Reset() {
    return (Migrate.umzug as any).down({ to: 0 })
  },

  ResetPrev() {
    return Migrate.Status().then(({ executed }: any) => {
      if (executed.length === 0) {
        throw new Error('Already at initial state')
      }
      const prev = executed[executed.length - 1].name
      return (Migrate.umzug as any).down({ to: prev })
    })
  },

  async HardReset() {
    return await new Promise((resolve: any, reject: any) => {
      utils.setImmediateAsync(async () => {
        try {
          try {
            PSQL.dropdb()
          } catch (e) {
            logger.info('no existing db to drop', llo({}))
          }
          PSQL.createdb()
          resolve()
        } catch (error) {
          logger.error('HardReset', llo({ error }))
          reject(error)
        }
      })
    })
  }
}

export default Migrate
