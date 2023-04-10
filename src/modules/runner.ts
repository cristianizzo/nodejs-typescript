import '@helpers/monitoring'
import { IService } from '@type/system/service'
import logger from '@logger'
import Connections from '@modules/connections'

const llo = logger.logMeta.bind(null, { service: 'runner' })

let stopping = false

function stopApps(instances: Array<{ app: IService; event?: any }>, code: number, timeToKill = 20 * 1000) {
  setTimeout(() => {
    process.exit(code) // eslint-disable-line no-process-exit
  }, timeToKill) // Force exit after timeout

  if (stopping) return
  stopping = true

  logger.info('Exiting...')
  logger.purge()

  Promise.all(
    instances.map((instance: { app: IService; event?: any }): boolean => {
      instance.app.stop()
      return true
    })
  )
    .then(async () => {
      await Connections.close()
    })
    .then(() => process.exit(code)) // eslint-disable-line no-process-exit
    .catch((error) => logger.error('global error', llo({ error })))
}

async function runApps(instances: Array<{ app: IService; event?: any }>) {
  try {
    process.on('exit', stopApps.bind(null, instances))
    process.on('SIGINT', stopApps.bind(null, instances))
    process.on('SIGTERM', stopApps.bind(null, instances))

    process.on('unhandledRejection', (error) => {
      logger.error('Unhandled Promise Rejection', llo({ error }))
      stopApps(instances, -1)
    })

    process.on('uncaughtException', (error) => {
      logger.error('Unhandled Exception', llo({ error }))
      stopApps(instances, -1)
    })

    const neededConnections = instances.reduce(
      (acc, instance) => (instance.app.NEED_CONNECTIONS ? acc.concat(instance.app.NEED_CONNECTIONS) : acc),
      []
    )
    await Connections.open(neededConnections)

    await Promise.all(instances.map(async (instance: { app: IService; event?: any }) => await instance.app.start(instance.event)))
  } catch (error) {
    logger.error('Unable to start application', llo({ error }))
    logger.purge()

    setTimeout(() => {
      process.exit(-1) // eslint-disable-line no-process-exit
    }, 1000)
  }
}

function Runner(apps: Array<{ app: IService; event?: any }>) {
  if (!apps) throw new Error('need app')

  runApps(apps).catch((error) => logger.error('run error', llo({ error })))
}

export default Runner
