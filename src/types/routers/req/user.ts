import {IUserAttribute} from "../../db/db";

export type ISignup = Pick<IUserAttribute, 'firstName' | 'lastName' | 'email' | 'password' | 'termsVersion'>
export type IAskLogin = Pick<IUserAttribute, 'email' | 'password'>
export type ILogin = Pick<IUserAttribute, 'email' | 'password'> & {
  twoFaCode: string;
};
export type IResetPassword = {
  token: string;
  newPassword: string;
};

export type IUpdateUser = Pick<IUserAttribute, 'firstName' | 'lastName' | 'termsVersion'>
export type IChangePassword = {
  oldPassword: string;
  newPassword: string;
}

// export type IJustUserId = Pick<IUser, 'userId'>
// export type IJustUserEmail = Pick<IUser, 'email'>
// export type IUpdateUser = IPickRequired<Pick<IUser, 'userId' | 'avatar' | 'firstName' | 'lastName'>, 'userId'>
// export type IUpdateUserPushNotification = IUserNotification;
// export const ValidRoleStrings = new Set(Object.values(IEnumUserRoleIds));
// export const isValidRole = (value: string) => ValidRoleStrings.has(value as IEnumUserRoleIds);
// export type IUserRoles = IEnumUserRoleIds;
// export type IUpdateUserRolePayload = Pick<IUser, 'userId' | 'role'>
// export type IValidateEmail = { twoFaCode: string; };
// export type IInviteUser = Pick<IUserAttribute, 'firstName' | 'lastName' | 'email'>
