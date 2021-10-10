const Store = require('electron-store');

const store = new Store({
  encryptionKey: 'The old apple revels in its authority',
});

import Web3 from 'web3';
import { ethereumChains } from '../contants';
import Logger from '../util/logger';
import { AddressFromPrivatekey } from './utilities/walletHandler';

class SuperWalletClass {
  private readonly instance: any = null;

  private nonceStore: Map<string, Map<string, number>> = new Map();

  constructor() {
    if (!this.instance) {
      this.instance = this;
    }

    ethereumChains.forEach((e) => {
      this.nonceStore.set(e.id, new Map());
    });

    Logger.log('Super Wallet created!');

    return this.instance;
  }

  public init() {}

  public AddPrivateKey(chain: string, privateKey: string) {
    const walletAddress = AddressFromPrivatekey(privateKey);

    this.Add(chain, walletAddress);
  }

  public async Add(chain: string, walletAddress: string) {
    try {
      if (!this.nonceStore.get(chain)?.has(walletAddress)) {
        const chainData = ethereumChains.find((e) => e.id === chain);

        if (chainData) {
          let provider: any = new Web3.providers.HttpProvider(chainData.rcpAddress);

          if (store.has('customRPC') && store.get('customRPC') !== '') {
            const customProvider = store.get('customRPC');

            if (customProvider?.includes('https://')) {
              provider = new Web3.providers.HttpProvider(customProvider);
            }
            if (customProvider?.includes('wss://')) {
              provider = new Web3.providers.WebsocketProvider(customProvider);
            }
          }

          const web3 = new Web3(provider);

          const nonce = await web3.eth.getTransactionCount(walletAddress);

          Logger.log(`Nonce: ${nonce} loaded for ${walletAddress}`);

          this.nonceStore.get(chain)?.set(walletAddress, nonce);
        }
      }
    } catch (error) {
      Logger.log(`Super wallet error`, error);
    }
  }

  public GetNonce(chain: string, walletAddress: string) {
    if (this.nonceStore.get(chain)?.has(walletAddress)) {
      const nonce = this.nonceStore.get(chain)?.get(walletAddress);

      Logger.log(`Super Wallet Get: nonce: ${nonce} for ${walletAddress}`);

      if (nonce) {
        return nonce;
      }
    }

    return null;
  }

  public IncNonce(chain: string, walletAddress: string) {
    if (this.nonceStore.get(chain)?.has(walletAddress)) {
      const nonce = this.nonceStore.get(chain)?.get(walletAddress);

      if (nonce) {
        Logger.log(`Super Wallet Increased: new nonce: ${nonce + 1} for ${walletAddress}`);

        this.nonceStore.get(chain)?.set(walletAddress, nonce + 1);
      }
    }
  }
}

const SuperWallet: SuperWalletClass = new SuperWalletClass();

export default SuperWallet;
