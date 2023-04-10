import { v4 as uuidv4 } from 'uuid'
import { DataTypes, Sequelize, CreateOptions } from 'sequelize'
import { IEnumTokenType, ITokenAttribute, IUserAttribute, IUserInstance } from '@type/db/db'
import { ITxOpts } from '@type/db/transaction'
import crypto from '@helpers/crypto'
import * as moment from 'moment'
import { pick } from 'lodash'
import { IUserRes } from '@type/routers/res/user'
import { ISignup } from '@type/routers/req/user'

export default function (sequelize: Sequelize): IUserInstance {
  const User = sequelize.define<IUserAttribute>(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv4()
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      fullName: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.firstName} ${this.lastName}`
        }
      },
      username: {
        type: DataTypes.STRING,
        allowNull: true
      },
      twoFactor: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      verifyEmail: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      termsVersion: {
        type: DataTypes.STRING,
        allowNull: true
      },
      countLoginFailed: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      }
    },
    {
      freezeTableName: true,
      timestamps: true
    }
  ) as IUserInstance

  User.prototype.getTokensByType = async function (type: IEnumTokenType, tOpts?: ITxOpts): Promise<ITokenAttribute[]> {
    return this.getTokens(Object.assign({ where: { type } }, tOpts))
  }

  User.prototype.removeTokensByType = async function (type: IEnumTokenType, tOpts?: ITxOpts): Promise<boolean[]> {
    const tokens = await this.getTokensByType(type, tOpts)

    return await Promise.all(
      tokens.map(async (token: ITokenAttribute) => {
        await token.destroy(tOpts)
      })
    )
  }

  User.prototype.setPassword = async function (password: string, tOpts?: ITxOpts): Promise<IUserAttribute> {
    const passwordHash = await crypto.bcrypt.hash(password)
    this.setDataValue('password', passwordHash)
    return this.save(tOpts)
  }

  User.prototype.validPassword = async function (password: string): Promise<boolean> {
    return await crypto.bcrypt.verifyHash(password, this.password)
  }

  User.prototype.filterKeys = function (): IUserRes {
    const filtered: any = pick(
      this,
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
      'createdAt'
    )

    filtered.createdAt = moment.utc(this.createdAt).format()

    return filtered
  }

  User.findByEmail = async (email: string, tOpts?: ITxOpts): Promise<IUserAttribute> => {
    return await (User.findOne({ where: { email } }) as Promise<IUserAttribute>)
  }

  const originalCreate = User.create.bind(User)

  User.create = async function (rawUser: ISignup, tOpts?: CreateOptions): Promise<IUserAttribute> {
    const password = await crypto.bcrypt.hash(rawUser.password)
    return originalCreate(Object.assign(rawUser, { password }), tOpts)
  }
  return User
}
