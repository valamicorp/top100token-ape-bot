import { ipcMain } from 'electron';

class LoggerClass {
  instance: any = null;
  data: any = {}; // store data in here

  constructor() {
    if (!this.instance) {
      this.instance = this;

      ipcMain.on('logger', (event, payload) => {
        this.log(payload);
      });
    }

    return this.instance;
  }

  public log(...args: any) {
    console.log(...args);
  }
}

const Logger: LoggerClass = new LoggerClass();

export default Logger;
