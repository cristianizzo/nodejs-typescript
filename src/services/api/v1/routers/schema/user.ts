import Joi from 'joi';
import {schema} from './validation';

const UserSchema = {
  createUser: Joi.object({
    firstName: Joi.string().trim().min(2).max(30),
    lastName: Joi.string().trim().min(2).max(30),
    email: schema.email,
    password: schema.password,
    termsVersion: Joi.string().min(3).max(10),
  }),

  askLogin: Joi.object({
    email: schema.email,
    password: schema.password,
  }),

  login: Joi.object({
    email: schema.email,
    password: schema.password,
    twoFaCode: schema.twoFaCode,
  }),

  askResetPassword: Joi.object({
    email: schema.email,
  }),

  resetPassword: Joi.object({
    token: schema.tokenCode,
    newPassword: schema.password,
  }),

  changeEmail: Joi.object({
    token: schema.tokenCode,
  }),

  validateEmail: Joi.object({
    pin: schema.twoFaCode,
  }),

  updateUser: Joi.object({
    firstName: Joi.string().trim().min(2).max(30).optional(),
    lastName: Joi.string().trim().min(2).max(30).optional(),
    termsVersion: Joi.string().min(3).max(10).optional(),
  }),

  changePassword: Joi.object({
    oldPassword: schema.password,
    newPassword: schema.password,
  }),

  enableTwoFactor: Joi.object({
    twoFaCode: schema.twoFaCode,
  }),

  disableTwoFactor: Joi.object({
    twoFaCode: schema.twoFaCode,
  }),

};

export default UserSchema;
