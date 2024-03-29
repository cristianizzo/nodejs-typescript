import { Context, Next, Request } from 'koa'
import { RouterOptions } from '@koa/router'
import { v4 as uuidv4 } from 'uuid'
import DeviceInfoMapper from '@helpers/deviceInfoMapper'
import logger from '@logger'

const llo = logger.logMeta.bind(null, { service: 'api-user:logger' })

interface RequestContext extends Request {
  route: RouterOptions
}

function cleanQuery(query: any) {
  const clean = { ...query }
  delete clean.password
  return clean
}

export default () => async (ctx: Context, next: Next) => {
  if (ctx.request.method === 'OPTIONS') {
    return await next()
  }

  const correlationId = uuidv4()

  ctx.requestInfo = {
    start: Date.now(),
    correlationId,
    deviceId: ctx.request.get('deviceId'),
    path: ctx.request.path,
    method: ctx.request.method,
    ip: ctx.request.ip,
    route: (ctx.request as RequestContext).route,
    url: ctx.request.url,
    host: ctx.request.host,
    protocol: ctx.request.protocol,
    origin: ctx.request.get('origin')
  }

  if (ctx.request.headers?.['user-agent']) {
    const userAgent = ctx.request.headers['user-agent']
    ctx.requestInfo.userAgentInfo = DeviceInfoMapper.getDeviceInfo(userAgent)
  }

  ctx.requestInfo.query = cleanQuery(ctx.request.query)

  ctx.response.set('X-Correlation-Id', correlationId)
  // TODO use cls to send correlationID to microservices

  await next()

  ctx.requestInfo.status = ctx.status
  ctx.requestInfo.time = Date.now() - ctx.requestInfo.start

  let level: 'verbose' | 'warn' | 'error' = 'verbose'

  if (ctx.requestInfo.error) {
    if (ctx.requestInfo.error.exposeCustom_) {
      level = 'warn'
    } else {
      level = 'error'
    }
  }

  logger[level]('API request', llo(ctx.requestInfo))
}
