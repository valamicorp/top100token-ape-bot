

import {  ipcMain } from 'electron';

export class ElectronBroker {
    public msg: Electron.IpcMain;
    public emit: (event: string, payload: Object) => void;


    constructor(window: Electron.BrowserWindow){

        this.msg = ipcMain;
        this.emit = (event: string, payload: Object) => window.webContents.send(event, payload);
    }


}