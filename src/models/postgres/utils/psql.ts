import * as child_process from 'child_process';
import logger from '@logger';

const llo = logger.logMeta.bind(null, { service: 'postgres:psql' });

function call(...args: any[]): string {
  try {
    const stdout = child_process.execSync(args.join(' '), { encoding: 'utf8' });
    return stdout.trim();
  } catch (error: any) {
    logger.info('call', llo({ error }));
    throw new Error(error.stderr.toString().trim());
  }
}

const PSQL = {
  dropdb(): void {
    const res = call('/usr/local/bin/dropdb', ['--username=postgres', '--host=localhost', 'compare'], {
      env: {
        PGPASSWORD: 'pwdpostgre'
      }
    });
    logger.info('dropped', llo({ res }));
  },

  createdb(): void {
    const res = call('/usr/local/bin/createdb', ['--username=postgres', '--host=localhost', 'compare'], {
      env: {
        PGPASSWORD: 'pwdpostgre'
      }
    });
    logger.info('created db', llo({ res }));
  },

  psql(): void {
    const res = call('/usr/local/bin/createdb', ['--username=postgres', '--host=localhost', 'compare'], {
      env: {
        PGPASSWORD: 'pwdpostgre'
      }
    });
    logger.info('created db', llo({ res }));
  },

  dump(): string {
    const dump = call(
      '/usr/local/bin/pg_dump',
      ['--dbname=compare', '--username=postgres', '--host=localhost', '--port=5432', '--insert'],
      {
        env: {
          PGPASSWORD: 'pwdpostgre'
        }
      }
    );
    logger.info('dumped', llo({}));

    return dump;
  }
};

export default PSQL;
