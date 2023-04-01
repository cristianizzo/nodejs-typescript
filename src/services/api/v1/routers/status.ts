import Router, {RouterContext} from '@koa/router';
import StatusController from '../controllers/status';
import {IAppInfo} from "../../../../types/routers/res/status";

const StatusRouter = {

  async status(ctx: RouterContext) {
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
}

export default StatusRouter;
