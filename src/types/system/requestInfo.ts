export interface IUserAgentInfo {
  deviceType?: string;
  osName?: string;
  osVersion?: string;
  browserName?: string;
  browserVersion?: string;
}

export interface IRequestInfo {
  start: number;
  correlationId: string;
  deviceId?: string;
  path: string;
  method: string;
  ip: string;
  url: string;
  host: string;
  protocol: string;
  countryCode?: string;
  origin?: string;
  userAgentInfo?: IUserAgentInfo;
  query?: { [key: string]: string };
  status?: number;
  time?: number;
  error?: Error;
}
