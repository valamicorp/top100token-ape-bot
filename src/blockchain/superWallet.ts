import Web3 from 'web3';
import { ethereumChains } from '../contants';
import  Logger  from '../util/logger';

class SuperWalletClass {
   private readonly instance: any = null;

   private nonceStore: Map<string,Map<string,number>> = new Map();

  constructor() {
    if (!this.instance) {
      this.instance = this;
    }

    ethereumChains.forEach(e=> {
      this.nonceStore.set(e.id, new Map());
    });


    Logger.log('Super Wallet created!')


    return this.instance;
  }

  public init(){}

  public async Add(chain: string, walletAddress: string){

    if(!this.nonceStore.get(chain)?.has(walletAddress)){
      const chainData = ethereumChains.find((e) => e.id === chain);

      if (chainData) {
        const provider = new Web3.providers.HttpProvider(chainData.rcpAddress);
        const web3 = new Web3(provider);

        const nonce = await web3.eth.getTransactionCount(walletAddress);

        this.nonceStore.get(chain)?.set(walletAddress, nonce);
      }
    }
  }

  public GetNonce(chain: string, walletAddress: string){
    if(this.nonceStore.get(chain)?.has(walletAddress)){

      const nonce = this.nonceStore.get(chain)?.get(walletAddress);

      Logger.log(`Super Wallet Get: nonce: ${nonce} for ${walletAddress}`);

      if(nonce){
        return nonce;
      }
    }

    return null;
  }

  public IncNonce(chain: string, walletAddress: string){
    if(this.nonceStore.get(chain)?.has(walletAddress)){

      const nonce = this.nonceStore.get(chain)?.get(walletAddress);

      Logger.log(`Super Wallet Increased: nonce: ${nonce} for ${walletAddress}`);

      if(nonce){
        this.nonceStore.get(chain)?.set(walletAddress, nonce+1)
      }
    }
  }


}

const SuperWallet: SuperWalletClass = new SuperWalletClass();

export default SuperWallet;
