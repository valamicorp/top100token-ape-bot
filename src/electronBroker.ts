

import {  ipcMain } from 'electron';
import Logger from './util/logger';

export class ElectronBroker {
    public msg: Electron.IpcMain;
    public emit: (event: string, payload: Object) => void;


    constructor(window: Electron.BrowserWindow){

        this.msg = ipcMain;
        this.emit = async (event: string, payload: Object) => {
                try {
                  await window.webContents.send(event, payload) 
                } catch (error) {
                    Logger.log('ElectronBroker emit error: ', error);
                }
        };


}
}