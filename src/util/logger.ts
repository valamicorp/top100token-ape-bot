import { ipcMain } from 'electron';

class LoggerClass {
  instance: any = null;
  data: any = {}; // store data in here
  private window?: Electron.BrowserWindow;

  constructor() {
    if (!this.instance) {
      this.instance = this;

      if(ipcMain){
        ipcMain.on('logger', (event, payload) => {
          this.log(payload);
        });
      }
      
    }

    return this.instance;
  }

  public setWindow (window: Electron.BrowserWindow){
    this.window = window;
  }

  public log(...args: any) {
    console.log(...args);

    if(this.window?.webContents){
      this.window.webContents.send('logger:log', [...args]);
    }

  }
}

const Logger: LoggerClass = new LoggerClass();

export default Logger;
