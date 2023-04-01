import {v4 as uuidv4} from 'uuid';
import {DataTypes, Sequelize} from 'sequelize';
import {IEnumTokenType, ITokenAttribute, IUserAttribute, IUserInstance,} from '../../types/db/db';
import {ITxOpts} from "../../types/db/transaction";
import crypto from "../../helpers/crypto";
import moment from "moment";
import {pick} from "lodash";
import {IUserRes} from "../../types/routers/res/user";

export default function (sequelize: Sequelize): IUserInstance {

  let User = sequelize.define<IUserAttribute>('User', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.firstName} ${this.lastName}`;
      }
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    twoFactor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    verifyEmail: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    termsVersion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    countLoginFailed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  }, {
    freezeTableName: true,
    timestamps: true,
  }) as IUserInstance;

  User.prototype.getTokensByType = function (type: IEnumTokenType, tOpts?: ITxOpts): Promise<ITokenAttribute[]> {
    return this.getTokens(Object.assign({where: {type}}, tOpts));
  };

  User.prototype.removeTokensByType = async function (type: IEnumTokenType, tOpts?: ITxOpts): Promise<boolean[]> {
    const tokens = await this.getTokensByType(type, tOpts);

    return Promise.all(tokens.map((token: ITokenAttribute) => token.destroy(tOpts)));
  };

  User.prototype.setPassword = async function (password: string, tOpts?: ITxOpts): Promise<IUserAttribute> {
    const passwordHash = await crypto.bcrypt.hash(password);
    this.setDataValue('password', passwordHash);
    return this.save(tOpts);
  };

  User.prototype.validPassword = function (password: string): Promise<boolean> {
    return crypto.bcrypt.verifyHash(password, this.password);
  };

  User.prototype.filterKeys = function (): IUserRes {
    const obj = this.toObject();
    const filtered: any = pick(
      obj,
      'id',
      'email',
      'firstName',
      'lastName',
      'verifyEmail',
      'isActive',
      'twoFactor',
      'termsVersion',
      'fullName',
      'username',
      'avatar',
      'createdAt',
    );

    filtered.createdAt = moment.utc(this.createdAt).format();

    return filtered;
  };

  User.findByEmail = (email: string, tOpts?: ITxOpts): Promise<IUserAttribute> => {
    return User.findOne({where: {email}}) as Promise<IUserAttribute>;
  }

  return User;
}
