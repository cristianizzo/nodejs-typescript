import { Transaction} from 'sequelize';

interface ITransaction extends Transaction {
  finished: string;
}

export interface ITxOpts {
  transaction: ITransaction;
}
