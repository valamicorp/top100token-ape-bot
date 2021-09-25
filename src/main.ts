import { ethereumChains } from './contants';
import { ApeEngine } from './engine/apeEngine';
import * as path from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { AddressFromPrivatekey, createWeb3Wallet, getEthBalance } from './blockchain/utilities/walletHandler';
import BigNumber from 'bignumber.js';
import { ApeOrder, ApeOrderStatus, AppState } from './types';
import { ElectronBroker } from './electronBroker';
import { ElectronStore } from './util/electronStorage';
const Store = require('electron-store');

let electronBroker: ElectronBroker;


const store = new Store({
  encryptionKey: 'The old apple revels in its authority',
});


const createWindow = (): Electron.BrowserWindow => {
  const window = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  window.loadFile(path.join(__dirname, '../assets/index.html'));

  if(process?.env?.DEBUG === 'true'){
    window.webContents.openDevTools();
  };

  window.on('closed', () => {
    (window as any) = null;
  });

  return window;
}

if (app) {
  Store.initRenderer();
  app.whenReady().then(()=> {
    const mainWindow = createWindow();

     electronBroker = new ElectronBroker(mainWindow);

     start(electronBroker).then();

  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
     const mainWindow = createWindow();

      electronBroker = new ElectronBroker(mainWindow);

      start(electronBroker).then();
    }
  });
}

var appState: AppState = {
  syncStared: false,
  buttonState: 'none',
  apeLoaded: null,
  runningApes: [],
  settings: {} as any
};


const startNewApe = () =>{
  if(appState.settings.apeAddress){
    const apeEngine = new ApeEngine(
      appState.settings.chain,
      appState.settings.privateKey,
      appState.settings.apeAmount,
      appState.settings.minProfit,
      appState.settings.gasPrice,
      appState.settings.gasLimit,
    );
  
    apeEngine.AddNewApe(appState.settings.apeAddress);
  
    appState.runningApes.push(apeEngine);
    appState.apeLoaded = appState.settings.apeAddress;
  
    const apeStore = new ElectronStore(`${appState.settings.privateKey}:apeOrders`, 'address');
  
    apeStore.Insert<ApeOrder>(apeEngine.SnapshotApe());
  }
}


const start = async (broker: ElectronBroker) => {

  // Bot already setted up!
  if(store.get("privateKey")){
    const privateKey = store.get("privateKey");

    appState.settings.privateKey = privateKey;

    const apeStore = new ElectronStore(`${privateKey}:apeOrders`, 'address');

    const allApes = await apeStore.Load<ApeOrder>();

    
    // TODO Load old APES
    // console.log("Load old apes: ", allApes);
  }

  if(store.get("chainId")){
    appState.settings.chain = store.get("chainId");
  }

  broker.msg.on('button:control', async (event, arg) => {
    try {
      appState.buttonState = arg;

      if (arg === 'start' && appState.apeLoaded === null) {
        startNewApe();
      }
  
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
  
  broker.msg.on('apeAddress:change', async (event, apeAddress) => {

    appState.settings.apeAddress = apeAddress;

      if(appState.buttonState === 'start' && appState.apeLoaded === null){
        startNewApe();
      }
  });

  broker.msg.on('setting:async', async (event, arg) => {
    appState.settings.privateKey = arg.privateKey;
    appState.settings.chain = arg.chain;
    appState.settings.apeAmount = arg.apeAmount;
    appState.settings.minProfit = arg.minProfit;
    appState.settings.gasPrice = arg.gasPrice;
    appState.settings.gasLimit = arg.gasLimit;
  });


  broker.msg.on('start:sync', ()=> {

    if(!appState.syncStared){

      appState.syncStared = true;

      setInterval(async ()=> {

        const chainData = ethereumChains.find((e) => e.id === appState.settings.chain);
        const walletAddress = AddressFromPrivatekey(appState.settings.privateKey);
     
        if(chainData){
  
          const ethBalance = await getEthBalance(chainData.rcpAddress, walletAddress);
  
          broker.emit('write:info',  {
            status: 'success',
            statusdDetails: undefined,
            chainName: `${chainData.name}`,
            walletAddress: `${walletAddress}`,
            walletBalance: `${new BigNumber(ethBalance).dividedBy(10 ** 18).toString()}`,
            currentProfit: appState?.runningApes[0]?.currProfit ?? '0.00%',
            traderStatus: appState?.runningApes[0]?.state ?? undefined,
          })
      
        }
        
      }, 1000);

    }
  });

  
  broker.msg.on('wallet:generate', async (event, arg) => {
    try {
      
      const result = createWeb3Wallet();
  
      event.reply('wallet:generate', {
        address: result.address,
        privateKey: result.privateKey,
      });
  
    } catch (error) {
   
    }
  });

  broker.msg.on('privateKey:new', async (event, arg) => {
    try {
      
      const result = createWeb3Wallet();
  
      event.reply('wallet:generate', {
        address: result.address,
        privateKey: result.privateKey,
      });
  
    } catch (error) {
   
    }
  });


} 


