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



}
