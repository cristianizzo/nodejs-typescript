interface ErrorDetail {
  [key: string]: any;
}

interface IExposableError extends Error {
  exposeCustom_?: boolean;
  status?: number;
  description?: string;
  exposeMeta?: any;
}

interface IErrorConfig {
  status: number;
  description: string;
}

interface IErrorMap {
  [key: string]: IErrorConfig;
}

const ERRORS: IErrorMap = {
  invalid_origin: {
    status: 503,
    description: 'Not authorised'
  },
  too_busy: {
    status: 503,
    description: 'Server too busy'
  },
  unknown_error: {
    status: 500,
    description: 'Unknown error'
  },
  access_denied: {
    status: 400,
    description: 'access denied'
  },
  not_implemented: {
    status: 501,
    description: 'Not implemented'
  },
  entity_too_large: {
    status: 413,
    description: 'The files you are trying to upload are too big'
  },
  method_not_allowed: {
    status: 405,
    description: 'The action you want to do is not allowed'
  },
  bad_params: {
    status: 400,
    description: 'Bad parameters'
  },
  bad_credentials: {
    status: 400,
    description: 'Bad credentials'
  },
  user_already_exist: {
    status: 403,
    description: 'Origin not allowed',
  },
  user_not_found: {
    status: 404,
    description: 'Bad credentials'
  },
  user_not_confirmed: {
    status: 404,
    description: 'User not confirmed'
  },
  signup_disabled: {
    status: 404,
    description: 'User disabled'
  },
  two_factor_token_required: {
    status: 404,
    description: 'This account has enabled two-factor authentication and the token is required',
  },
  two_factor_token_invalid: {
    status: 404,
    description: 'The two-factor token you provided is invalid',
  },
  two_factor_code_required: {
    status: 404,
    description: 'The two-factor token is required',
  },
  two_factor_code_invalid: {
    status: 404,
    description: 'The two-factor token you provided is invalid',
  },
  token_expired: {
    status: 404,
    description: 'This token is expired',
  },
  disabled_account: {
    status: 404,
    description: 'Account disabled',
  },
  password_should_be_different: {
    status: 404,
    description: 'New password should be different',
  },
  invalid_token: {
    status: 404,
    description: 'Invalid token',
  }
};

const throwError = (message: string, detail: ErrorDetail = {}) => {
  const err = new Error(message);

  Object.assign(err, detail);

  throw err;
};

const throwExposable = (code: string, status?: number | null, description?: string | null, exposeMeta?: any) => {
  const error: IErrorConfig = ERRORS[code];
  if (!error) {
    throwError('unknown_error_code', {
      code,
      status,
      description,
      exposeMeta,
    });
  }
  const err: IExposableError = new Error(code);
  err.exposeCustom_ = true;

  err.status = status || error.status;
  err.description = description || error.description;

  if (exposeMeta) {
    err.exposeMeta = exposeMeta;
  }

  throw err;
};

function castExposable(error: Error) {
  if ((error as IExposableError).exposeCustom_) {
    throw error;
  }

  throwExposable(error.message, (error as IExposableError).status, (error as IExposableError).description);
}

function assert(condition: boolean, message: string, detail?: ErrorDetail) {
  if (!condition) {
    throwError(message, detail);
  }
}

function assertExposable(condition: boolean, code: string, status?: number | null, description?: string | null, exposeMeta?: any) {
  if (!condition) {
    throwExposable(code, status, description, exposeMeta);
  }
}

function bodyParserError(error: any) {
  if (error.type === 'entity.too.large') {
    throwExposable('entity_too_large');
  } else {
    throwExposable('bad_params', 400, error.message);
  }
}

export {
  throwError,
  throwExposable,
  bodyParserError,
  assert,
  assertExposable,
  castExposable,
  ERRORS
}

/****
 HTTP ERROR CODES

 100 "continue"
 101 "switching protocols"
 102 "processing"
 200 "ok"
 201 "created"
 202 "accepted"
 203 "non-authoritative information"
 204 "no content"
 205 "reset content"
 206 "partial content"
 207 "multi-status"
 208 "already reported"
 226 "im used"
 300 "multiple choices"
 301 "moved permanently"
 302 "found"
 303 "see other"
 304 "not modified"
 305 "use proxy"
 307 "temporary redirect"
 308 "permanent redirect"
 400 "bad request"
 401 "unauthorized"
 402 "payment required"
 403 "forbidden"
 404 "not found"
 405 "method not allowed"
 406 "not acceptable"
 407 "proxy authentication required"
 408 "request timeout"
 409 "conflict"
 410 "gone"
 411 "length required"
 412 "precondition failed"
 413 "payload too large"
 414 "uri too long"
 415 "unsupported media type"
 416 "range not satisfiable"
 417 "expectation failed"
 418 "I'm a teapot"
 422 "unprocessable entity"
 423 "locked"
 424 "failed dependency"
 426 "upgrade required"
 428 "precondition required"
 429 "too many requests"
 431 "request header fields too large"
 500 "internal server error"
 501 "not implemented"
 502 "bad gateway"
 503 "service unavailable"
 504 "gateway timeout"
 505 "http version not supported"
 506 "variant also negotiates"
 507 "insufficient storage"
 508 "loop detected"
 510 "not extended"
 511 "network authentication required"
 */
