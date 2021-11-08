// Seems Node owners are not really care about their TLS_CERT and common to get 'CERT_HAS_EXPIRED' Error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Load Before everything
import Logger from './util/logger';
import SuperWallet from './blockchain/superWallet';

import { ethereumChains } from './contants';
import { ApeEngine } from './engine/apeEngine';
import * as path from 'path';
import { app, BrowserWindow } from 'electron';
import { createWeb3Wallet } from './blockchain/utilities/walletHandler';
import BigNumber from 'bignumber.js';
import {  ApeOrder, AppState } from './types';
import { ElectronBroker } from './electronBroker';
import { ElectronStore } from './util/electronStorage';
import Web3 from 'web3';
import { TelegramScrapper } from './plugins/telegram/telegram';
import SQL from './util/sqlStorage';
import { CoinMarketCap } from './plugins/coinmarketcap/cmcPlugin';
import { SwapWallet } from './blockchain/swapWallet';
const Store = require('electron-store');

let electronBroker: ElectronBroker;

BigNumber.set({ EXPONENTIAL_AT: 80 });

SuperWallet.init();

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

  if (process?.env?.DEBUG === 'true') {
    window.webContents.openDevTools();
  }

  return window;
};

if (app) {
  Store.initRenderer();
  SQL.init();
  /*
  SQL.ReadData<ApeHistoryDB>('apeHistory').then((data)=> {
    console.log(data)
  });
  */

  app.whenReady().then(() => {
    const mainWindow = createWindow();

    electronBroker = new ElectronBroker(mainWindow);

    Logger.setWindow(mainWindow);

    start(electronBroker).then();
  });
  app.on('window-all-closed', () => {
    app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const mainWindow = createWindow();

      electronBroker = new ElectronBroker(mainWindow);

      Logger.setWindow(mainWindow);

      start(electronBroker).then();
    }
  });
}

var appState: AppState = {
  syncStared: false,
  buttonState: 'none',
  privateKey: '',
  runningApes: [],
  settings: {} as any,
};

const startNewApe = (apeAddress: string, broker: ElectronBroker) => {
  if (apeAddress) {
    if (appState.runningApes.find((e) => e.contractAddress === apeAddress && e.orderStatus <= 7)) {
      Logger.log('You cannot create new Ape order for the given address!');
      return;
    }

    const apeEngine = new ApeEngine({
      chainId: appState.settings.chainId,
      privateKey: appState.privateKey,
      apeAmount: appState.settings.apeAmount,
      minProfitPct: appState.settings.minProfit,
      gasprice: appState.settings.gasPrice,
      gasLimit: appState.settings.gasLimit,
    });

    apeEngine.SafeBuyApe(apeAddress);

    appState.runningApes.unshift(apeEngine);

    const allApes = appState.runningApes.map((e) => e.SnapshotApe());

    broker.emit(
      'portfolio:sync',
      allApes.filter((e) => e.status < 8),
    );
  }
};

const start = async (broker: ElectronBroker) => {
  // Load Settings
  if (store.get('chainId')) {
    appState.settings.chainId = store.get('chainId');
  }
  if (store.has('apeAmount')) {
    appState.settings.apeAmount = store.get('apeAmount');
  }
  if (store.has('minProfit')) {
    appState.settings.minProfit = store.get('minProfit');
  }
  if (store.has('gasPrice')) {
    appState.settings.gasPrice = store.get('gasPrice');
  }
  if (store.has('gasLimit')) {
    appState.settings.gasLimit = store.get('gasLimit');
  }

  // Bot already setted up!
  if (store.has('privateKey')) {
    const privateKey = store.get('privateKey');

    appState.privateKey = privateKey;

    if (appState.settings.chainId) {
      SuperWallet.AddPrivateKey(appState.settings.chainId, appState.privateKey);
    }

    const apeStore = new ElectronStore(`${privateKey}:apeOrders`, 'address');

    const allApes = await apeStore.Load<ApeOrder>();

    // Load Portfolio Apes
    allApes.forEach((apeOrder) => {
      // Only load orders which has still something to do
      if (apeOrder.status >= 2 && apeOrder.status <= 6) {
        const apeEngine = new ApeEngine({
          chainId: apeOrder.chain,
          privateKey: appState.privateKey,
          apeAmount: Web3.utils.fromWei(apeOrder.apeAmount, 'ether'),
          minProfitPct: apeOrder.minProfit.toString(),
        });

        apeEngine.LoadSnapshotApe(apeOrder);
        apeEngine.CreateEventQueue(3000); // Slow down update interval

        appState.runningApes.push(apeEngine);
      }
    });
  }

  // TELEGRAM PLUGIN
  if (store.has('telegramAPI') && store.has('telegramAPIHASH')) {
    if (store.has('telegramSession') && store.has('telegramChannel')) {
      const tgOption = {
        api: store.get('telegramAPI'),
        hash: store.get('telegramAPIHASH'),
        session: store.get('telegramSession'),
        channel: store.get('telegramChannel'),
        filter: store.get('telegramFilter') || '',
      };

      const telegramSignaler = new TelegramScrapper(tgOption.api, tgOption.hash, tgOption.session, tgOption.channel, tgOption.filter);
      telegramSignaler.on('newSignal', async (address: string) => {
        try {
          if (store.has('signalHistoryTg')) {
            if (store.get('signalHistoryTg') === address) {
              return;
            }
          }

          store.set('signalHistoryTg', address);

          if (appState.runningApes.find((e) => e.contractAddress === address && e.orderStatus <= 7)) {
            Logger.log('You cannot create new Ape order for the given address!');
            return;
          }

          const apeEngine = new ApeEngine({
            chainId: appState.settings.chainId,
            privateKey: appState.privateKey,
            apeAmount: appState.settings.apeAmount,
            minProfitPct: appState.settings.minProfit,
            gasprice: appState.settings.gasPrice,
            gasLimit: appState.settings.gasLimit,
          });

          apeEngine.SafeBuyApe(address);

          appState.runningApes.push(apeEngine);
        } catch (error) {
          Logger.log('Unable to start Telegram Signal APE');
        }
      });
    }
  }

  // CMC PLUGIN
  if (store.has('coinmarketcapAPI')) {
    const cmcSignaler = new CoinMarketCap(store.get('coinmarketcapAPI'));
    cmcSignaler.on('newSignal', async (address: string) => {
      try {
        if (store.has('signalHistoryCMC')) {
          if (store.get('signalHistoryCMC') === address) {
            return;
          }
        }

        store.set('signalHistoryCMC', address);

        if (appState.runningApes.find((e) => e.contractAddress === address && e.orderStatus <= 7)) {
          Logger.log('You cannot create new Ape order for the given address!');
          return;
        }

        const apeEngine = new ApeEngine({
          chainId: appState.settings.chainId,
          privateKey: appState.privateKey,
          apeAmount: appState.settings.apeAmount,
          minProfitPct: appState.settings.minProfit,
          gasprice: appState.settings.gasPrice,
          gasLimit: appState.settings.gasLimit,
        });

        apeEngine.SafeBuyApe(address);

        appState.runningApes.push(apeEngine);
      } catch (error) {
        Logger.log('Unable to start CMC Signal APE');
      }
    });
  }

  broker.msg.on('button:control', async (event, action, apeAddress) => {
    try {
      if (action === 'start') {
        startNewApe(apeAddress, broker);
      }
    } catch (error) {
      event.reply('asynchronous-reply', {
        status: 'error',
        statusdDetails: error,
      });
    }
  });

  broker.msg.on('setting:async', async (event, arg) => {
    if (appState.settings.chainId != arg.chain || appState.privateKey != arg.privateKey) {
      SuperWallet.AddPrivateKey(arg.chain, arg.privateKey);
    }

    appState.privateKey = arg.privateKey;
    appState.settings.chainId = arg.chain;
    appState.settings.apeAmount = arg.apeAmount;
    appState.settings.minProfit = arg.minProfit;
    appState.settings.gasPrice = arg.gasPrice;
    appState.settings.gasLimit = arg.gasLimit;
  });

  broker.msg.on('start:sync', () => {
    const apeStore = new ElectronStore(`${appState.privateKey}:apeOrders`, 'address');

    if (!appState.syncStared) {
      appState.syncStared = true;

      const allApes = appState.runningApes.map((e) => e.SnapshotApe());
      broker.emit(
        'portfolio:sync',
        allApes.filter((e) => e.status < 8),
      );

      setInterval(async () => {
        const chainData = ethereumChains.find((e) => e.id === appState.settings.chainId);

        if (chainData) {
          const wallet = new SwapWallet(appState.settings.chainId, appState.privateKey);

          const ethBalance = await wallet.GetEthBalance();

          broker.emit('write:info', {
            status: 'success',
            statusdDetails: undefined,
            chainName: `${chainData.name}`,
            walletAddress: `${wallet.walletAddress}`,
            walletBalance: `${new BigNumber(ethBalance).dividedBy(10 ** 18).toString()}`,
          });
        }
      }, 1000);

      setInterval(async () => {
        const allApes = appState.runningApes.map((e) => e.SnapshotApe());

        broker.emit(
          'portfolio:sync',
          allApes.filter((e) => e.status < 8),
        );

        const runningApes: ApeOrder[] = appState.runningApes.map((e) => e.SnapshotApe());

        if (runningApes.length > 0) {
          await apeStore.Write<ApeOrder>(runningApes);
        }
      }, 5000);
    }
  });

  broker.msg.on('portfolio:stop', async (event, address) => {
    try {
      const portfolioApe = appState.runningApes.find((e) => e.contractAddress === address && e.orderStatus < 8);

      if (portfolioApe) {
        portfolioApe.StopApe();
      }

      Logger.log('portfolio:stop', address);
    } catch (error) {}
  });

  broker.msg.on('portfolio:sell', async (event, address) => {
    try {
      const portfolioApe = appState.runningApes.find((e) => e.contractAddress === address && e.orderStatus < 8);

      if (portfolioApe) {
        portfolioApe.PanicSell();
      }

      Logger.log('portfolio:sell', address);
    } catch (error) {}
  });

  broker.msg.on('wallet:generate', async (event, arg) => {
    try {
      const result = createWeb3Wallet();

      event.reply('wallet:generate', {
        address: result.address,
        privateKey: result.privateKey,
      });
    } catch (error) {}
  });

  broker.msg.on('privateKey:new', async (event, arg) => {
    try {
      const result = createWeb3Wallet();

      event.reply('wallet:generate', {
        address: result.address,
        privateKey: result.privateKey,
      });
    } catch (error) {}
  });
};
