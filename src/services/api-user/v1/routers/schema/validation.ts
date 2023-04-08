import * as Joi from 'joi'
import { throwExposable } from '@errors'
import * as disposableEmailDomains from 'disposable-email-domains'
import * as disposableEmailWildcards from 'disposable-email-domains/wildcard.json'

export const schema = {
  uuid: Joi.string().guid({
    version: ['uuidv4']
  }),
  email: Joi.string()
    .trim()
    .lowercase()
    .max(64)
    .email()
    .custom((value, helper) => {
      const domain = value.split('@')[1]

      if (!disposableEmailDomains.includes(domain) && !disposableEmailWildcards.find((wildcard) => domain.endsWith(wildcard))) {
        return value
      }

      return helper.error('Email not acceptable')
    }),
  password: Joi.string().length(64),
  twoFaCode: Joi.string().length(6),
  tokenCode: Joi.string().alphanum().uppercase().length(32),
  mobile: Joi.string().regex(/^\+[0-9]{1,3}[0-9]{9,12}$/),
  mobileVerificationCode: Joi.string().alphanum().length(8),
  coinCode: Joi.string().min(3).uppercase().max(5),
  date: Joi.date().iso().greater('1974-01-01T00:00:00.001Z').less('now'),
  pagination: Joi.object({
    limit: Joi.number().integer().default(10).optional(),
    offset: Joi.number().integer().greater(-1).default(0).optional(),
    order: Joi.string().valid('asc', 'desc').default('desc').optional()
  }),

  validateParams: async (schema: Joi.Schema, params: any) => {
    try {
      return await schema.validateAsync(params, { presence: 'required' })
    } catch (error: any) {
      const validationError = {
        params,
        errors: error.details.map((detail: any) => detail.message)
      }

      if (validationError.params.password) {
        delete validationError.params.password
      }

      throwExposable('bad_params', null, null, {
        validationError
      })
    }
  }
}
