import { SequelizeStorage, Umzug } from 'umzug';
import Postgres from '@modules/postgres';
import logger from '@logger';
import PSQL from './psql';
import { QueryInterface, Sequelize } from 'sequelize';

const llo = logger.logMeta.bind(null, { service: 'postgres:migration' });

function logUmzugEvent(eventName: string) {
  return function({ name }: { name: string }) {
    console.log(`${name} ${eventName}`); // eslint-disable-line no-console
  };
}


// https://github.com/abelnation/sequelize-migration-hello

const Migrate = {
  umzug: null as Umzug | null,

  SetSequelize: (sequelize: Sequelize): void => {
    if (Migrate.umzug) {
      (Migrate.umzug as any).removeAllListeners();
    }

    const parent: any = new Umzug({
      logger: undefined,
      storage: new SequelizeStorage({ sequelize }),
      context: sequelize.getQueryInterface() as QueryInterface,
      migrations: {
        glob: './src/models/pg/migrations/*.ts',
        resolve: ({ name, path, context }) => {
          const migration = require(path as string);

          return {
            name,
            up: async () =>
              Postgres.executeTxFn(async ({ transaction }: any) => {
                await migration.up(context as QueryInterface, transaction);
                await transaction.commit();
              }),
            down: async () =>
              Postgres.executeTxFn(async ({ transaction }: any) => {
                await migration.down(context as QueryInterface, transaction);
                await transaction.commit();
              })
          };
        }
      }
    });


    Migrate.umzug = new Umzug({
      ...parent.options,
      migrations: async () =>
        (await parent.migrations()).sort((a: any, b: any) => {
          const aVersion = /(\d*).*/.exec(a.name)![1];
          const bVersion = /(\d*).*/.exec(b.name)![1];
          return parseInt(aVersion, 10) > parseInt(bVersion, 10) ? 1 : -1;
        })
    });

    Migrate.umzug.on('migrating', logUmzugEvent('migrating'));
    Migrate.umzug.on('migrated', logUmzugEvent('migrated'));
    Migrate.umzug.on('reverting', logUmzugEvent('reverting'));
    Migrate.umzug.on('reverted', logUmzugEvent('reverted'));
  },

  Status() {
    let result: any = {};

    return (Migrate.umzug as any)
      .executed()
      .then((executed: any) => {
        result.executed = executed;
        return (Migrate.umzug as any).pending();
      })
      .then((pending: any) => {
        result.pending = pending;
        return result;
      })
      .then(({ executed, pending }: any) => {
        const current = executed.length > 0 ? executed[executed.length - 1].name : '<NO_MIGRATIONS>';
        const status = {
          current,
          executed: executed.map((m: any) => m.name),
          pending: pending.map((m: any) => m.name)
        };

        logger.info('status', llo(status));

        return { executed, pending };
      });
  },

  Migrate() {
    return (Migrate.umzug as any).up();
  },

  MigrateNext() {
    return Migrate.Status().then(({ pending }: any) => {
      if (pending.length === 0) {
        throw new Error('No pending migrations');
      }
      const next = pending[0].name;
      return (Migrate.umzug as any).up({ to: next });
    });
  },

  Reset() {
    return (Migrate.umzug as any).down({ to: 0 });
  },

  ResetPrev() {
    return Migrate.Status().then(({ executed }: any) => {
      if (executed.length === 0) {
        throw new Error('Already at initial state');
      }
      const prev = executed[executed.length - 1].name;
      return (Migrate.umzug as any).down({ to: prev });
    });
  },

  HardReset() {
    return new Promise((resolve: any, reject: any) => {
      setImmediate(async () => {
        try {
          try {
            PSQL.dropdb();
          } catch (e) {
            logger.info('no existing db to drop', llo({}));
          }
          PSQL.createdb();
          resolve();
        } catch (error) {
          logger.error('HardReset', llo({ error }));
          reject(error);
        }
      });
    });
  }
};

export default Migrate;
