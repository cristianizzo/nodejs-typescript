import logger from '@logger'
import Create from '@models/postgres/utils/create'

const llo = logger.logMeta.bind(null, { service: 'runner:postgres:create' })

Create()
  .then(() => process.exit(0)) // eslint-disable-line no-process-exit
  .catch((error: any) => logger.error('global error', llo({ error })))
