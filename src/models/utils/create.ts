import Models from '../pg/';
import logger from '../../modules/logger';
import DB from '../../modules/db';
import Utils from '../../helpers/utils';
import UserJson from '../initialData/user.json';
import UserRoleJson from '../initialData/userRole.json';
import UserNotificationJson from '../initialData/userNotification.json';

const llo = logger.logMeta.bind(null, {service: 'db-create'});

async function create() {
  if (!DB.sequelize) {
    await DB.connect();
    logger.info('Connection has been established successfully', llo({}));
  }

  const modelsName = Object.keys(Models);

  logger.info('Create models', llo({modelsName}));

  await DB.sequelize.query(
    ['CREATE EXTENSION IF NOT EXISTS "uuid-ossp"', 'CREATE EXTENSION IF NOT EXISTS "hstore"'].join(';')
  );

  await DB.sequelize.sync({force: true});

  logger.info('Populating database', llo({}));

  await populateTable(UserRoleJson, Models.UserRole);
  await populateTable(UserJson, Models.User);
  await populateTable(UserNotificationJson, Models.UserNotification);

}

function populateTable(objects: any, model: any) {
  return Utils.asyncForEach(objects, (object: any) => model.create(object.data));
}

/* istanbul ignore if */
if (require.main === module) {
  create()
    .then(() => process.exit(0)) // eslint-disable-line no-process-exit
    .catch((error) => logger.error('global error', llo({error})));
} else {
  module.exports = create;
}
