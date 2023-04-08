import { DataTypes, Sequelize } from 'sequelize';
import { IUserNotificationAttribute, IUserNotificationInstance } from '@type/db/db';

export default function(sequelize: Sequelize): IUserNotificationInstance {

  const UserNotification = sequelize.define<IUserNotificationAttribute>('UserNotification', {
      expoToken: {
        type: DataTypes.STRING,
        primaryKey: true
      }
    },
    {
      freezeTableName: true,
      timestamps: false
    }) as IUserNotificationInstance;

  return UserNotification;
};
