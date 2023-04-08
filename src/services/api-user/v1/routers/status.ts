import * as Router from '@koa/router'
import StatusController from '@api-user/v1/controllers/status'

const StatusRouter = {
  async status(ctx: Router.RouterContext) {
    ctx.body = StatusController.get()
  },

  router() {
    const router = new Router()

    /**
     * @api {get} / Get status
     * @apiName status
     * @apiGroup Status
     * @apiDescription Get status
     *
     * @apiSampleRequest /
     *
     */
    router.get('/', StatusRouter.status)

    return router
  }
}

export default StatusRouter
