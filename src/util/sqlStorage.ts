import { databaseName } from '../contants';

import { Knex, knex } from 'knex';

import { app } from 'electron';

import * as path from 'path';
import Logger from './logger';

let dbFileLocation = databaseName;

if (app) {
  dbFileLocation = path.join(app.getPath('userData'), databaseName);
}

export interface TransactionsDB {
  chain: string;
  address: string;
  side: string;
  time: number;
  amountCoin: string;
  amountToken: string;
}

export const storageConfig: Knex.Config = {
  client: 'sqlite3',
  connection: {
    filename: `${dbFileLocation}`,
  },
  useNullAsDefault: true,
};

export type StorageTables = 'transactions' | 'none';

export class SQLStorageService {
  knex!: Knex<any, unknown[]>;
  instance: any = null;

  constructor() {
    if (!this.instance) {
      this.instance = this;

      this.knex = knex(storageConfig);

      this.CreateTables();
    }

    return this.instance;
  }

  public init() {}

  public async ReadData<T>(table: StorageTables, where?: any) {
    if (!where) {
      const allRows = await this.knex<T>(table).select('*');

      return allRows;
    } else {
      const allRows = await this.knex<T>(table).select('*').where(where);

      return allRows;
    }
  }

  public async InsertData<T>(data: T | T[], table: StorageTables) {
    let insertData: T[] = [];

    if (!Array.isArray(data)) {
      insertData = [data];
    } else {
      insertData = [...data];
    }

    insertData.forEach(async (singleData) => {
      try {
        await this.knex<T>(table).insert(singleData as any);
      } catch (error) {
        Logger.log('Failed to write DB', error);
      }
    });
  }

  private async CreateTables() {
    try {
      await this.knex.schema.createTable('transactions', (table) => {
        table.increments('id');
        table.string('chain');
        table.string('address');
        table.string('side');
        table.integer('time');
        table.string('amountCoin');
        table.string('amountToken');
      });
    } catch (error) {
      Logger.log('SQL create table error', error);
    }
  }
}

const SQL: SQLStorageService = new SQLStorageService();

export default SQL;
