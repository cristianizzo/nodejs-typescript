import { Transaction } from 'sequelize'

export interface ITransaction extends Transaction {
  id?: string
  finished: string
}

export interface ITxOpts {
  transaction: ITransaction
}
