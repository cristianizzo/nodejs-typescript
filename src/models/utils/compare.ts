const fs = require('fs');

import create from './create';
import Migrate from './migrate';
import DB from '../../modules/db';
import PSQL from './psql';
import logger from '../../modules/logger';

const llo = logger.logMeta.bind(null, {service: 'db-compare'});

function compareWithoutInsert(a, b) {
  function filterInsert(t) {
    const l = t.split('\n');
    const f = l.filter((o) => o.indexOf('INSERT') !== 0);
    return f.join('');
  }

  const af = filterInsert(a);
  const bf = filterInsert(b);

  return af === bf;
}

(async () => {
  try {
    // with create
    try {
      PSQL.dropdb();
    } catch (e) {
      logger.info('no existing db to drop', llo({}));
    }
    PSQL.createdb();

    await DB.connect();
    await create();
    await DB.disconnect();
    const dumpCreate = PSQL.dump();
    fs.writeFileSync('./dumpCreate.sql', dumpCreate);

    // with migrate
    PSQL.dropdb();
    PSQL.createdb();

    await DB.connect();
    Migrate.SetSequelize(DB.sequelize);
    await Migrate.Migrate();
    const dumpMigrate = PSQL.dump();
    fs.writeFileSync('./dumpMigrate.sql', dumpMigrate);

    logger.info(dumpCreate.length, llo({}));
    logger.info(dumpMigrate.length, llo({}));
    logger.info('equals:', llo({value: dumpMigrate === dumpCreate}));
    logger.info(
      'equals without insert',
      llo({
        compareWithoutInsert: compareWithoutInsert(dumpMigrate, dumpCreate),
      })
    );

    logger.info(dumpCreate.length, llo({}));

    logger.info('done', llo({}));
    process.exit(0); // eslint-disable-line no-process-exit
  } finally {
    await DB.disconnect();
  }
})().catch(console.error); // eslint-disable-line no-console
