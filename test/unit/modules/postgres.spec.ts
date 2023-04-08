import * as sinon from 'sinon';
import { expect } from 'chai';
import Postgres from '@modules/postgres';
import { ITxOpts } from '../../../src/types/db/transaction';

describe('Postgres', () => {
  let sandbox: any = null;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox && sandbox.restore();
  });

  it('Should error concurrent', () => {
    const errUpdate = new Error('could not serialize access due to concurrent update');
    expect(Postgres.isErrorConcurrent(errUpdate)).to.be.true;
    const errDelete = new Error('could not serialize access due to concurrent delete');
    expect(Postgres.isErrorConcurrent(errDelete)).to.be.true;
  });

  it('Cannot error concurrent if is not', () => {
    const err = new Error('could not serialize');

    expect(Postgres.isErrorConcurrent(err)).to.be.false;
  });

  it('get transaction options', async () => {
    const tOpts = await Postgres.transactionOptions();
    expect(tOpts.transaction.id).to.exist;
    await tOpts.transaction.rollback();
  });

  describe('isAlreadyCommitted', () => {
    it('Should be already committed', async () => {
      const error: any = { message: 'Transaction cannot be rolled back because it has been finished with state: commit' };
      expect(Postgres.isAlreadyCommitted(error)).to.be.true;
    });
    it('Should not be already committed', async () => {
      const error: any = { message: null };
      expect(Postgres.isAlreadyCommitted(error)).to.be.false;
    });
  });

  describe('retry tx', () => {
    let rollback: any;

    beforeEach(() => {
      rollback = sinon.stub().resolves();
      sandbox.stub(Postgres, 'transactionOptions').returns({
        transaction: {
          rollback,
          finished: null
        }
      });
    });

    it('retry transaction error concurrent', async () => {
      let i = 0;

      async function fn(tOpts: ITxOpts) {
        expect(tOpts.transaction).to.exist;
        if (i === 0 || i === 1) {
          i++;
          throw new Error('could not serialize access due to concurrent update');
        }
        return 'ok';
      }

      const res = await Postgres.executeTxFn(fn);

      expect(res).to.eq('ok');
      expect(rollback.callCount).to.eq(2);
    });

    it('retry transaction error readwrite', async () => {
      let i = 0;

      async function fn(tOpts: ITxOpts) {
        expect(tOpts.transaction).to.exist;
        i++;
        if (i === 1) {
          throw new Error('could not serialize access due to read/write dependencies among transactions');
        }
        return 'ok';
      }

      const res = await Postgres.executeTxFn(fn);

      expect(res).to.eq('ok');
      expect(rollback.callCount).to.eq(1);
      expect(i).to.eq(2);
    });

    it('retry if already commited after rollback', async () => {
      rollback.rejects(
        new Error('Transaction cannot be rolled back because it has been finished with state: commit')
      );
      let i = 0;

      async function fn() {
        i++;
        if (i === 1) {
          throw new Error('could not serialize access due to read/write dependencies among transactions');
        }
        return 'ok';
      }

      const res = await Postgres.executeTxFn(fn);

      expect(res).to.eq('ok');
      expect(rollback.callCount).to.eq(1);
      expect(i).to.eq(2);
    });

    it('retry transaction error rollback error', async () => {
      (Postgres.transactionOptions as any).restore();
      rollback = sinon.stub().resolves();
      sandbox.stub(Postgres, 'transactionOptions').returns({
        transaction: {
          rollback: rollback
        }
      });

      let i = 0;

      async function fn() {
        i++;
        if (i === 1 || i === 2) {
          throw new Error('could not serialize access due to concurrent update');
        } else if (i === 3) {
          throw new Error('could not serialize access due to read/write dependencies among transactions');
        }
        return 'ok';
      }

      const res = await Postgres.executeTxFn(fn);

      expect(res).to.eq('ok');
      expect(rollback.callCount).to.eq(3);
      expect(i).to.eq(4);
    });

    it('Transaction error already rollback error', async () => {
      (Postgres.transactionOptions as any).restore();
      rollback = sinon.stub().resolves();
      sandbox.stub(Postgres, 'transactionOptions').returns({
        transaction: {
          rollback: rollback,
          finished: 'rollback'
        }
      });

      async function fn() {
        throw new Error('something');
      }

      await expect(Postgres.executeTxFn(fn)).to.be.rejectedWith(Error, 'something');

      expect(rollback.callCount).to.eq(0);
    });

    it('retry transaction error always concurrent', async () => {
      async function fn() {
        throw new Error('could not serialize access due to concurrent update');
      }

      await expect(Postgres.executeTxFn(fn)).to.be.rejectedWith(Error, 'sql_concurrent');
    });

    it('works first', async () => {
      async function fn() {
        return 'ok';
      }

      const res = await Postgres.executeTxFn(fn);

      expect(res).to.eq('ok');
      expect(rollback.callCount).to.eq(0);
    });

    it('other error', async () => {
      let i = 0;

      async function fn() {
        if (i === 0 || i === 1) {
          i++;
          throw new Error('could not serialize access due to concurrent update');
        }
        throw new Error('something');
      }

      await expect(Postgres.executeTxFn(fn)).to.be.rejectedWith(Error, 'something');
    });
  });
});
