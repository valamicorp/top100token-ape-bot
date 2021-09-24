import { ethereumChains } from './contants';
import { ApeEngine } from './engine/apeEngine';
import * as path from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { AddressFromPrivatekey, getEthBalance } from './blockchain/utilities/walletHandler';
import BigNumber from 'bignumber.js';
import { AppState } from './types';
const Store = require('electron-store');

let mainWindow: Electron.BrowserWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../assets/index.html'));

  // mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => {
    (mainWindow as any) = null;
  });
}

if (app) {
  Store.initRenderer();
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

var appState: AppState = {
  buttonState: 'none',
  apeLoaded: null,
  runningApes: [],
};

// Electron Events

ipcMain.on('button:control', async (event, arg) => {
  try {
    appState.buttonState = arg;

    if (arg === 'pause' && appState.runningApes[0]) {
      appState.runningApes[0].PauseApe();
    }

    if (arg === 'stop' && appState.runningApes[0]) {
      appState.runningApes[0].StopApe();
      appState.runningApes.pop();
      appState.apeLoaded = null;
      appState.buttonState = 'none';
    }

    if (arg === 'panicSell' && appState.runningApes[0]) {
      appState.runningApes[0].PanicSell();
      appState.buttonState = 'panicSell';
    }
  } catch (error) {
    event.reply('asynchronous-reply', {
      status: 'error',
      statusdDetails: error,
    });
  }
});

ipcMain.on('setting:async', async (event, arg) => {
  try {
    const chainData = ethereumChains.find((e) => e.id === arg.chain);

    if (chainData && arg.privateKey !== '') {
      const walletAddress = AddressFromPrivatekey(arg.privateKey);

      if (!walletAddress) {
        throw new Error('Invalid PrivateKey!');
      }

      const privateKey = arg.privateKey;

      const ethBalance = await getEthBalance(chainData.rcpAddress, walletAddress);

      event.reply('asynchronous-reply', {
        status: 'success',
        statusdDetails: undefined,
        chainName: `${chainData.name}`,
        walletAddress: `${walletAddress}`,
        walletBalance: `${new BigNumber(ethBalance).dividedBy(10 ** 18).toString()}`,
        currentProfit: appState?.runningApes[0]?.currProfit ?? '0.00%',
        traderStatus: appState?.runningApes[0]?.state ?? undefined,
      });

      if (appState.buttonState === 'start') {
        if (arg.apeAddress && appState.apeLoaded === null) {
          const apeEngine = new ApeEngine(
            chainData.id,
            privateKey,
            arg.apeAmount,
            arg.minProfit,
            arg.gasPrice,
            arg.gasLimit,
          );

          apeEngine.AddNewApe(arg.apeAddress);

          appState.runningApes.push(apeEngine);
          appState.apeLoaded = arg.apeAddress;
        }
      }

      return;
    }

    throw new Error('No chain found!');
  } catch (error) {
    event.reply('asynchronous-reply', {
      status: 'error',
      statusdDetails: error,
    });
  }
});
