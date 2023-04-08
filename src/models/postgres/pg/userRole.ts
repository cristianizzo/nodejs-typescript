import { DataTypes, Sequelize } from 'sequelize';
import { IUserRoleAttribute, IUserRoleInstance } from '@type/db/db';

export default function(sequelize: Sequelize): IUserRoleInstance {

  const UserRole = sequelize.define<IUserRoleAttribute>('UserRole', {
      id: {
        type: DataTypes.STRING,
        primaryKey: true
      }
    },
    {
      freezeTableName: true,
      timestamps: false
    }) as IUserRoleInstance;

  return UserRole;
};
