import * as sinon from 'sinon';
import { expect } from 'chai';
import Utils from '@helpers/utils';
import logger from '@modules/logger';

describe('Helpers: Utils', () => {
  let sandbox: any = null;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
  });

  afterEach(async () => {
    sandbox && sandbox.restore();
  });

  it('Should noop', () => {
    expect(Utils.noop()).to.eq(0);
  });

  it('Should wait', (done) => {
    let end = false;

    Utils.wait(500)
      .then(() => {
        end = true;
        return true;
      })
      .catch((error: any) => console.error(error));

    setTimeout(() => {
      if (end) {
        done('too early');
      }
    }, 300);
    setTimeout(() => {
      if (end) {
        done();
      } else {
        done('too late');
      }
    }, 600);
  });

  it('Should get default error', () => {
    Utils.defaultError(new Error('test-err'));
  });

  it('setImmediateAsync', async () => {
    let rs = false;
    let th = false;

    const error = new Error('er');
    const logerror = sandbox.stub(logger, 'error');

    const fnResolve = async () => {
      await Utils.wait(100);
      rs = true;
    };
    const fnThrow = async () => {
      await Utils.wait(100);
      th = true;
      throw error;
    };

    Utils.setImmediateAsync(fnResolve);
    Utils.setImmediateAsync(fnThrow);

    expect(rs).to.be.false;
    expect(th).to.be.false;

    await Utils.wait(110);

    expect(rs).to.be.true;
    expect(th).to.be.true;

    expect(logerror.args[0][0]).to.eq(error.message);
    expect(logerror.args[0][1].error).to.eq(error);
  });

  it('configParser', () => {
    const configSource = {
      string: 'coucou',
      array: 'coucou,caca',
      boolt: 'true',
      boolf: 'false',
      boolu: 'f',
      integer: 12,
      decimal: 12.12
    };
    expect(Utils.configParser(configSource, 'string', 'string')).to.eq('coucou');
    expect(Utils.configParser(configSource, 'string', 'string', 'def')).to.eq('coucou');
    expect(Utils.configParser(configSource, 'string', 'array')).to.eq('coucou,caca');
    expect(Utils.configParser(configSource, 'string', 'unknown')).to.eq('');
    expect(Utils.configParser(configSource, 'string', 'unknown', 'def')).to.eq('def');

    expect(Utils.configParser(configSource, 'array', 'array')).to.deep.eq(['coucou', 'caca']);
    expect(Utils.configParser(configSource, 'array', 'array', ['def'])).to.deep.eq(['coucou', 'caca']);
    expect(Utils.configParser(configSource, 'array', 'string')).to.deep.eq(['coucou']);
    expect(Utils.configParser(configSource, 'array', 'unknown')).to.deep.eq([]);
    expect(Utils.configParser(configSource, 'array', 'unknown', ['def'])).to.deep.eq(['def']);

    expect(Utils.configParser(configSource, 'bool', 'boolt')).to.be.true;
    expect(Utils.configParser(configSource, 'bool', 'boolt', false)).to.be.true;
    expect(Utils.configParser(configSource, 'bool', 'boolf')).to.be.false;
    expect(Utils.configParser(configSource, 'bool', 'boolu')).to.be.false;
    expect(Utils.configParser(configSource, 'bool', 'boolunnn')).to.be.false;
    expect(Utils.configParser(configSource, 'bool', 'boolunnn', true)).to.be.true;

    expect(Utils.configParser(configSource, 'number', 'integer')).to.eq(12);
    expect(Utils.configParser(configSource, 'number', 'decimal')).to.eq(12.12);
    expect(Utils.configParser(configSource, 'number', 'unkn')).to.eq(0);
    expect(Utils.configParser(configSource, 'number', 'unkn', 2)).to.eq(2);
    // expect(() => Utils.configParser(configSource, 'unk', 'string')).to.throw();
  });

  it('Should generate random digits specific length', () => {
    const digits = Utils.randomDigits(12);
    expect(typeof digits).eq('string');
    expect(digits.length).eq(12);
  });

  it('Should parse json circular', () => {
    const child: any = {};
    const obj = { a: 1, child };
    child.obj = obj;
    expect(Utils.JSONStringifyCircular(obj)).to.be.eq('{\n  "a": 1,\n  "child": {}\n}');
  });

  it('asyncForEach', async () => {
    let i = 0;
    let done = false;
    const arr = [0, 1, 2, 3];

    async function fn(obj: any, index: number, array: any) {
      expect(obj).to.eq(i);
      expect(index).to.eq(i);
      expect(array).to.eq(arr);
      i++;
      if (i === 3) done = true;
    }

    await Utils.asyncForEach(arr, fn);

    expect(done).to.be.true;
  });

  it('Should asyncForEach and break on false', async () => {
    const stubFn = sandbox.stub().callsFake(async (item: any, i: number) => i !== 1);
    await Utils.asyncForEach([0, 1, 2, 3], stubFn, true);
    expect(stubFn.callCount).to.be.eq(2);
  });

  it('Should remove empty strings', async () => {
    const data: any = {
      a: 'a',
      b: 'b',
      c: '',
      d: undefined
    };

    const clean = Utils.removeEmptyStrings(data);
    expect(clean).to.have.property('a', 'a');
    expect(clean).to.have.property('b', 'b');
    expect(clean).not.to.have.property('c');
    expect(clean).not.to.have.property('d');
  });

});
