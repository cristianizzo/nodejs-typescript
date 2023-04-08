import { Transaction } from 'sequelize';

interface ITransaction extends Transaction {
  id?: string;
  finished: string;
}

export interface ITxOpts {
  transaction: ITransaction;
}
