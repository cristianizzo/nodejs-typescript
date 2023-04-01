import {IEnumUserRoleIds} from "../../db/db";

export enum IEnumLoginType {
  email = 'email',
  twoFa = '2fa'
}

export interface ILoginTypeRes {
  type: IEnumLoginType;
}

export interface IUserRes {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  isActive: boolean;
  verifyEmail: boolean;
  twoFactor: boolean;
  avatar: string;
  email: string;
  termsVersion: string;
  createdAt: Date | string;
  role: IEnumUserRoleIds;
}

export interface ILoginRes {
  token: string;
  user: IUserRes;
}
export interface IAskTwoFactorRes {
  secret: string;
  qrData: string;
}
