import { IUserAttribute } from '../../db/db'

export type ISignup = Pick<IUserAttribute, 'firstName' | 'lastName' | 'email' | 'password' | 'termsVersion'>
export type IAskLogin = Pick<IUserAttribute, 'email' | 'password'>
export type ILogin = Pick<IUserAttribute, 'email' | 'password'> & {
  twoFaCode: string
}
export interface IResetPassword {
  token: string
  newPassword: string
}

export type IUpdateUser = Pick<IUserAttribute, 'firstName' | 'lastName' | 'termsVersion'>
export interface IChangePassword {
  oldPassword: string
  newPassword: string
}
