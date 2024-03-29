import { CreateOptions, FindOptions, InferAttributes, InferCreationAttributes, Model, ModelCtor, SaveOptions } from 'sequelize'
import { ITxOpts } from './transaction'
import { IRequestInfo, IUserAgentInfo } from '../system/requestInfo'
import { IUserRes } from '../routers/res/user'
import UserRole from '@models/postgres/pg/userRole'
import User from '@models/postgres/pg/user'
import UserNotification from '@models/postgres/pg/userNotification'
import Token from '@models/postgres/pg/token'
import { ITokenRes } from '@type/routers/res/token'

// all tables

export interface IModels {
  User: ReturnType<typeof User>
  UserRole: ReturnType<typeof UserRole>
  UserNotification: ReturnType<typeof UserNotification>
  Token: ReturnType<typeof Token>
}

/// User
export interface IUserAttribute extends Model<InferAttributes<IUserAttribute>, InferCreationAttributes<IUserAttribute>> {
  id: string
  firstName: string
  lastName: string
  fullName?: string
  username?: string
  isActive: boolean
  verifyEmail: boolean
  twoFactor: boolean
  avatar?: string
  email: string
  password: string
  termsVersion: string
  countLoginFailed: number

  createdAt?: Date | string
  updatedAt?: Date | string
  RoleId?: IEnumUserRoleIds

  getTokens: (opts?: FindOptions) => Promise<ITokenAttribute[]>

  getTokensByType: (type: IEnumTokenType, tOpts?: ITxOpts) => Promise<ITokenAttribute[]>

  removeTokensByType: (type: IEnumTokenType, tOpts?: ITxOpts) => Promise<boolean[]>

  setPassword: (password: string, tOpts?: ITxOpts) => Promise<IUserAttribute>

  validPassword: (email: string) => Promise<any>

  save: (options?: SaveOptions) => Promise<this>

  filterKeys: () => IUserRes
}

export interface IUserInstance extends ModelCtor<IUserAttribute> {
  create: (attributes: any, options?: CreateOptions) => any

  findByEmail: (email: string, tOpts?: ITxOpts) => Promise<IUserAttribute | null>
}

/// UserRole
export enum IEnumUserRoleIds {
  ADMIN = 'ADMIN',
  FULL_ACCESS = 'FULL_ACCESS',
  AGREEMENT_BASED = 'AGREEMENT_BASED'
}

export interface IUserRoleAttribute extends Model<InferAttributes<IUserRoleAttribute>, InferCreationAttributes<IUserRoleAttribute>> {
  id?: IEnumUserRoleIds

  save: (options?: SaveOptions) => Promise<this>
}

export interface IUserRoleInstance extends ModelCtor<IUserRoleAttribute> {}

/// UserNotification
export interface IUserNotificationAttribute
  extends Model<InferAttributes<IUserNotificationAttribute>, InferCreationAttributes<IUserNotificationAttribute>> {
  expoToken?: string

  save: (options?: SaveOptions) => Promise<this>
}

export interface IUserNotificationInstance extends ModelCtor<IUserNotificationAttribute> {}

/// Token
export enum IEnumTokenType {
  RESET_PASSWORD = 'RESET_PASSWORD',
  AUTH = 'AUTH',
  TWO_FACTOR_LOGIN = 'TWO_FACTOR_LOGIN',
  TWO_FACTOR_EMAIL_LOGIN = 'TWO_FACTOR_EMAIL_LOGIN',
  CHANGE_EMAIL = 'CHANGE_EMAIL'
}

export interface ITokenAttribute extends Model<InferAttributes<ITokenAttribute>, InferCreationAttributes<ITokenAttribute>> {
  id: string
  value: string
  extraValue: string | null
  clientIp: string
  type: IEnumTokenType
  userAgentInfo: IUserAgentInfo
  deviceId: string | null
  suspicious: boolean
  extra: any
  UserId?: string

  createdAt?: Date
  updatedAt?: Date

  updateForce: (params: ITokenAttribute, tOpts?: ITxOpts) => Promise<ITokenAttribute>

  save: (options?: SaveOptions) => Promise<this>
  filterKeys: () => ITokenRes
}

export interface ITokenInstance extends ModelCtor<ITokenAttribute> {
  findByTypeAndValueWithUser: (
    type: IEnumTokenType,
    value: string,
    tOpts?: ITxOpts
  ) => Promise<
    ITokenAttribute & {
      User: IUserAttribute
    }
  >

  createToken: (
    userId: string,
    value: string,
    type: IEnumTokenType,
    requestInfo?: IRequestInfo,
    extraValue?: any,
    tOpts?: ITxOpts
  ) => Promise<ITokenAttribute>

  createForLogin: (userId: string, requestInfo: IRequestInfo, tOpts?: ITxOpts) => Promise<ITokenAttribute>

  createFor2FAEmail: (
    user: IUserAttribute,
    requestInfo: IRequestInfo,
    tOpts?: ITxOpts
  ) => Promise<{
    token: ITokenAttribute
    pinCode: string
  }>

  createForResetPassword: (user: IUserAttribute, requestInfo: IRequestInfo, tOpts?: ITxOpts) => Promise<ITokenAttribute | null>

  createFor2Fa: (
    user: IUserAttribute,
    requestInfo: IRequestInfo,
    tOpts?: ITxOpts
  ) => Promise<{
    token: ITokenAttribute
    secret: string
  }>

  createForChangeEmail: (user: IUserAttribute, extraValue: any, requestInfo: IRequestInfo, tOpts?: ITxOpts) => Promise<ITokenAttribute>

  verify2FA: (user: IUserAttribute, twoFaCode: string, requestInfo: IRequestInfo, tOpts?: ITxOpts) => Promise<boolean>
}
