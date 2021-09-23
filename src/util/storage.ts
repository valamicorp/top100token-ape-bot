import { databaseName } from "../contants";

import { Knex, knex } from 'knex'

const path = require('path');

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
    filename: `${databaseName}`,
  },
  useNullAsDefault: true,
};

export type StorageTables = 'transactions' | 'none';

export class StorageService {
    knex: Knex<any, unknown[]>;

    constructor(config: any){
        this.knex = knex(config);

        this.CreateTables();
    }

    public async ReadData<T>(table: StorageTables, where?: any){

        if(!where){
            const allRows = await this.knex<T>(table).select('*');

            return allRows;
        }
        else{
            const allRows = await this.knex<T>(table).select('*').where(where);

            return allRows; 
        }
    
    }

    public async InsertData<T>(data: T | T[], table: StorageTables){
        let insertData: T[] = [];

        if(!Array.isArray(data)){
            insertData = [data];
        }
        else{
            insertData = [...data];
        }

        insertData.forEach(async singleData => {
            try {
                await this.knex<T>(table).insert(singleData as any);
            } catch (error) {
                console.log('Failed to write DB', error);
            }
           
        })
    }


    private async CreateTables(){
        try {
            await this.knex.schema
            .createTable('transactions', table => {
              table.increments('id');
              table.string('chain');
              table.string('address');
              table.string('side');
              table.integer('time');
              table.string('amountCoin');
              table.string('amountToken');
            });
        } catch (error) {
            
        }
    }




}