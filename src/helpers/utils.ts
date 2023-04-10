import Decimal from 'decimal.js'
import axios from 'axios'

const Utils = {
  noop: (): number => 0,

  async wait(ms: number): Promise<number> {
    return await new Promise((resolve) =>
      setTimeout(() => {
        resolve(ms)
      }, ms)
    )
  },

  defaultError(error: any): void {
    console.error(error) // eslint-disable-line no-console
  },

  setImmediateAsync(fn: any, onError?: any): void {
    fn().catch(onError != null || Utils.defaultError)
  },

  configParser(configSource: any = process.env, type: 'string' | 'array' | 'number' | 'bool', key: string, defaultValue?: any) {
    const val = configSource[key]

    function def(v: any) {
      return defaultValue === undefined ? v : defaultValue
    }

    switch (type) {
      case 'string': {
        return val || def('')
      }

      case 'array': {
        return val ? val.split(',') : def([])
      }

      case 'number': {
        if (!val) return def(0)

        const djs = new Decimal(val)
        return djs.toNumber()
      }

      case 'bool': {
        return val ? val === 'true' : def(false)
      }

      default: {
        throw new Error('Unknown variable type')
      }
    }
  },

  randomDigits(length = 6): string {
    const max = 10 ** length
    const min = 10 ** (length - 1)
    return Math.floor(Math.random() * (max - min) + min).toString()
  },

  JSONStringifyCircular(object: any): string {
    const cache: any[] = []
    return JSON.stringify(
      object,
      function (key, value) {
        if (typeof value === 'object' && value !== null) {
          if (cache.includes(value)) {
            return
          }
          cache.push(value)
        }
        return value
      },
      2
    )
  },

  async asyncForEach(array: any[], fn: any, breakOnFalse = false): Promise<any[]> {
    const results: boolean[] = []
    for (let index = 0; index < array.length; index++) {
      const res = await fn(array[index], index, array)

      if (breakOnFalse && res === false) {
        break
      }
      results.push(res)
    }
    return results
  },

  // asyncParallel: (tasks: any[], onError: Function): Promise<any[]> =>
  //   new Promise((resolve) => {
  //     const wrappedTasks = async.reflectAll(tasks);
  //
  //     function callback(err: Error, results: any[]) {
  //       const successResults = results.filter((res: any) => !!res.value).map((res: any) => res.value) as any[];
  //       const errorResults = results.filter((res: any) => !!res.error).map((res: any) => res.error) as any[];
  //
  //       errorResults.forEach((error) => onError && onError(error));
  //       resolve(successResults);
  //     }
  //
  //     async.parallel(wrappedTasks, callback);
  //   }),
  //
  // asyncMap: (array: any[], fn: Function, onError: Function):Promise<any> => {
  //   assert(array && fn && onError, 'missing parameters');
  //   const tasks = array.map((element) => async () => fn(element)) as any[];
  //
  //   return Utils.asyncParallel(tasks, onError);
  // },

  removeEmptyStrings(data: Record<string, string>): Record<string, string> {
    return Object.keys(data).reduce<Record<string, string>>((acc, prop) => {
      if (data[prop] !== '' && data[prop] !== undefined) {
        return Object.assign(acc, { [prop]: data[prop] })
      }
      return acc
    }, {})
  },

  axios
}

export default Utils
