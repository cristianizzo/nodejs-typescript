import {Sequelize} from 'sequelize';
import User from '../pg/user';
import UserRole from "../pg/userRole";
import UserNotification from "../pg/userNotification";
import Token from "../pg/token";
import {IModels} from "../../types/db/db";

export const setModels = (sequelize: Sequelize) => {

  const Models: IModels = {
    User: User(sequelize),
    UserRole: UserRole(sequelize),
    UserNotification: UserNotification(sequelize),
    Token: Token(sequelize),
  };

  Models.User.belongsTo(Models.UserRole, {constraints: true, as: 'Role'});
  Models.UserRole.hasMany(Models.User, {constraints: true});
  Models.User.belongsTo(Models.UserNotification, {constraints: true});
  Models.UserNotification.hasOne(Models.User, {constraints: true});

  Object.keys(Models).forEach((modelName) => {
    console.log('Model', modelName)
  });
}
