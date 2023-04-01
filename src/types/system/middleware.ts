export interface IJWTData {
  auth: string;
  agent: string;
  token: string;
}

export interface IAssertOpts {
  isActive?: boolean;
  verifyEmail?: boolean;
}
