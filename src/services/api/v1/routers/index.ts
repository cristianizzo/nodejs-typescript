import Router from '@koa/router';
import StatusRouter from './status';
import UsersRouter from './users';

const MainRouter = {
  router() {
    const usersRouter = UsersRouter.router();
    const statusRouter = StatusRouter.router();

    const mainRouter = new Router();

    mainRouter.use(statusRouter.routes(), statusRouter.allowedMethods());

    mainRouter.use('/user', usersRouter.routes(), usersRouter.allowedMethods());

    return mainRouter;
  }
}

export default MainRouter.router();
