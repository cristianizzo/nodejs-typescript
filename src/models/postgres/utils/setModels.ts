import { Sequelize } from 'sequelize'
import User from '../pg/user'
import UserRole from '../pg/userRole'
import UserNotification from '../pg/userNotification'
import Token from '../pg/token'
import Models from '@postgresModels'

export const setModels = (sequelize: Sequelize) => {
  // TODO: dynamically import models
  // const modelsPath = path.resolve(__dirname, '../pg/');
  // fs.readdirSync(modelsPath)
  //   .filter((file) => file.indexOf('.') !== 0 && file !== 'index.ts' && file.slice(-3) === '.ts')
  //   .forEach((file) => {
  //     const model  = require(path.join(modelsPath, file)).default(sequelize);
  //     // console.log(0, model.modelsName);
  //     // Models[model.name] = model;
  //   });

  Models.User = User(sequelize)
  Models.UserRole = UserRole(sequelize)
  Models.UserNotification = UserNotification(sequelize)
  Models.Token = Token(sequelize)

  Models.UserRole.belongsTo(Models.User, { constraints: true })
  Models.User.belongsTo(Models.UserRole, { constraints: true })

  Models.UserNotification.belongsTo(Models.User, { constraints: true })
  Models.User.hasOne(Models.UserNotification, { constraints: true })

  Object.keys(Models).forEach((modelName) => {
    console.log('Model', modelName)
  })
}
