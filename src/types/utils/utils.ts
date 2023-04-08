// Pick some fields to be mandatory, everything else is partial
export type IPickRequired<T, K extends keyof T> = Pick<T, K> & Partial<T>

export type IDeepPartial<T> = T extends object ? { [P in keyof T]?: IDeepPartial<T[P]> } : T;

export type IRequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>
}[Keys];
