import * as Router from '@koa/router'
import StatusRouter from '@api-user/v1/routers/status'
import UsersRouter from '@api-user/v1/routers/users'

const MainRouter = {
  router() {
    const usersRouter = UsersRouter.router()
    const statusRouter = StatusRouter.router()

    const mainRouter = new Router()

    mainRouter.use(statusRouter.routes(), statusRouter.allowedMethods())

    mainRouter.use('/user', usersRouter.routes(), usersRouter.allowedMethods())

    return mainRouter
  }
}

export default MainRouter
