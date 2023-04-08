import { Sequelize, Transaction } from 'sequelize';
import logger from '@logger';
import config from '@config';
import { setModels } from '@models/postgres/utils/setModels';
import { assert } from '@helpers/errors';
import Utils from '@helpers/utils';
import { ITxOpts } from '@type/db/transaction';
import ISOLATION_LEVELS = Transaction.ISOLATION_LEVELS;

const llo = logger.logMeta.bind(null, { service: 'postgres' });

const Postgres = {
  sequelize: null as Sequelize | any,
  Sequelize: Sequelize,

  setup() {
    Postgres.sequelize = new Sequelize(config.POSTGRES.URI, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: config.POSTGRES.SSL ? { rejectUnauthorized: false } : false
      },
      pool: {
        max: config.POSTGRES.MAX_CONNECTION,
        min: 0,
        idle: 30 * 1000,
        acquire: 60 * 1000
      },
      retry: {
        match: [
          // /SequelizeConnectionError/,
          // /SequelizeConnectionRefusedError/,
          // /SequelizeHostNotFoundError/,
          // /SequelizeHostNotReachableError/,
          // /SequelizeInvalidConnectionError/,
          // /SequelizeDatabaseError/,
          /Operation timeout/,
          /SequelizeConnectionAcquireTimeoutError/,
          /Operation timeout/,
          /SequelizeConnectionAcquireTimeoutError: Operation timeout/,
          /TimeoutError: query timed out/,
          /query timed out/,
          /SequelizeConnectionTimedOutError/,
          /TimeoutError/,
          /ResourceRequest timed out/,
          /TimeoutError: ResourceRequest timed out/
        ],
        max: 10
      },
      logging: () => 0
    });

    setModels(Postgres.sequelize);
  },

  async connect() {
    if (!Postgres.sequelize) Postgres.setup();

    try {
      await Postgres.sequelize.authenticate();
      logger.verbose('PostgresSQL successfully connected', llo({
        host: Postgres.sequelize.options.host
      }));
    } catch (error) {
      logger.error('Unable to connect to PostgresSQL', llo({
        error,
        host: Postgres.sequelize.options.host
      }));
      throw error;
    }
  },

  async disconnect() {
    if (!Postgres.sequelize) return;

    try {
      await Postgres.sequelize.close();
      Postgres.sequelize = null;
      logger.silly('PostgresSQL successfully disconnected', llo({}));
    } catch (error) {
      logger.error('Unable to disconnect from PostgresSQL', llo({ error }));
      throw error;
    }
  },

  isErrorConcurrent(error: Error): boolean {
    return error.message.indexOf('could not serialize access due to concurrent') === 0;
  },

  isErrorDependencies(error: Error): boolean {
    return error.message === 'could not serialize access due to read/write dependencies among transactions';
  },

  isAlreadyCommitted(error: Error): boolean {
    return error.message === 'Transaction cannot be rolled back because it has been finished with state: commit';
  },

  async transactionOptions(): Promise<ITxOpts> {

    return {
      transaction: await Postgres.sequelize.transaction({
        isolationLevel: ISOLATION_LEVELS.SERIALIZABLE
      })
    };
  },

  /*
  ATTENTION
  Last executed call MUST be a transaction.commit in this callback!
  Otherwise, may not detect unattended errors
   */
  async executeTxFn(fn: any): Promise<any> {
    async function tryFn() {
      const tOpts: ITxOpts = await Postgres.transactionOptions();

      let res = null;

      try {
        res = await fn(tOpts);
        return res;
      } catch (error) {
        if (tOpts.transaction.finished !== 'rollback' && tOpts.transaction.finished !== 'commit') {
          try {
            await tOpts.transaction.rollback();
          } catch (errorRollback) {
            logger.warn('unable to rollback transaction', llo({ error: errorRollback }));
          }
        }

        throw error;
      }
    }

    try {
      return await tryFn();
    } catch (error) {
      return await Postgres.handleTxError(error, tryFn);
    }
  },

  async handleTxError(error: any, retryFn: any, i = 0): Promise<any> {
    if (Postgres.isErrorDependencies(error) || Postgres.isErrorConcurrent(error)) {

      logger.warn('SQL concurrent error', llo({ error }));

      assert(i < 10, 'sql_concurrent', { errorSQL: error });

      await Utils.wait(Math.round(Math.random() * config.POSTGRES.RETRY_CONCURRENT_TIME) + 100);

      try {
        return await retryFn();
      } catch (error) {
        return await Postgres.handleTxError(error, retryFn, ++i);
      }
    } else {
      throw error;
    }
  }

};

export default Postgres;
