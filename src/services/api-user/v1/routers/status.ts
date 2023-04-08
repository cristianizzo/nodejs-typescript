import * as Router from '@koa/router';
import StatusController from '@api-user/v1/controllers/status';
import { IAppInfo } from '../../../../types/routers/res/status';

const StatusRouter = {

  async status(ctx: Router.RouterContext) {
    ctx.body = await StatusController.get() as IAppInfo;
  },

  router() {
    const router = new Router();

    /**
     * @api {get} / Get status
     * @apiName status
     * @apiGroup Status
     * @apiDescription Get status
     *
     * @apiSampleRequest /
     *
     */
    router.get('/', StatusRouter.status);

    return router;
  }
};

export default StatusRouter;
