import Decimal from 'decimal.js'

const Utils = {
  noop: (): number => 0,

  wait(ms: number): Promise<number> {
    return new Promise((resolve) => setTimeout(() => resolve(ms), ms));
  },

  defaultError(error: any): void {
    console.error(error); // eslint-disable-line no-console
  },

  setImmediateAsync(fn: Function, onError?: Function): void {
    fn().catch(onError || Utils.defaultError);
  },

  configParser(
    configSource = process.env,
    type: 'string' | 'array' | 'number' | 'bool',
    key: string,
    defaultValue?: any
  ) {
    const val = configSource[key];

    function def(v: any) {
      return defaultValue === undefined ? v : defaultValue;
    }

    switch (type) {
      case 'string': {
        return val || def('');
      }

      case 'array': {
        return val ? val.split(',') : def([]);
      }

      case 'number': {
        if (!val) return def(0);

        const djs = new Decimal(val);
        return djs.toNumber();
      }

      case 'bool': {
        return val ? val === 'true' : def(false);
      }

      default: {
        throw new Error('Unknown variable type');
      }
    }
  },

  randomDigits(length = 6): string {
    const max = 10 ** length;
    const min = 10 ** (length - 1);
    return Math.floor(Math.random() * (max - min) + min).toString();
  },

  JSONStringifyCircular(object: any): string {
    const cache: any[] = [];
    return JSON.stringify(
      object,
      function (key, value) {
        if (typeof value === 'object' && value !== null) {
          if (cache.indexOf(value) !== -1) {
            return;
          }
          cache.push(value);
        }
        return value;
      },
      2
    );
  },

  async asyncForEach(array: any[], fn: Function, breakOnFalse = false): Promise<(any)[]> {
    const results: (boolean | void)[] = [];
    for (let index = 0; index < array.length; index++) {
      const res = await fn(array[index], index, array);

      if (breakOnFalse && res === false) {
        break;
      }
      results.push(res);
    }
    return results;
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
    return Object.keys(data).reduce((acc, prop) => {
      if (data[prop] !== '' && data[prop] !== undefined) {
        return Object.assign(acc, {[prop]: data[prop]});
      }
      return acc;
    }, {} as Record<string, string>);
  },

  capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export default Utils;
