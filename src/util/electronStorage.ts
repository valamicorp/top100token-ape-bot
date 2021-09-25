const Store = require('electron-store');

const store = new Store({
  encryptionKey: 'The old apple revels in its authority',
});

export class ElectronStore {
  protected key: string;
  private uniqueField: string;

  constructor(key: string, uniqueField?: string) {
    this.key = key;
    this.uniqueField = uniqueField ?? '';
  }

  public async Purge(){
    await store.delete(this.key);
  }

  public async Write<T>(data: T | T[]) {
    let arrayData: T[] = [];

    if (!Array.isArray(data)) {
      arrayData = [data];
    } else {
      arrayData = [...data];
    }

    const stringify = JSON.stringify(arrayData);

    await store.set(this.key, stringify);
  }

  public async Load<T>(): Promise<T[]> {
    const dataStringified = await store.get(this.key);

    if(!dataStringified){
        return [];
    }
    const data = JSON.parse(dataStringified);

    if (!Array.isArray(data)) {
      return [data];
    } else {
      return [...data];
    }
  }

  public async Insert<T>(data: T) {
    try {
      const values = await this.Load<T>();

      if (this.uniqueField) {
        const find = values.find((e) => e[this.uniqueField] === data[this.uniqueField]);

        if (find) {
          return;
        } else {
          values.push(data);

          await this.Write<T>(values);
        }
      }
    } catch (error) {
      console.log('Error while insert data into store!', error);
    }
  }

}
