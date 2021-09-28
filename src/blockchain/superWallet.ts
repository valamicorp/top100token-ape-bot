import  Logger  from '../util/logger';

class SuperWalletClass {
   private readonly instance: any = null;

  constructor() {
    if (!this.instance) {
      this.instance = this;
    }

    Logger.log('Super Wallet created!')

    return this.instance;
  }

  public init(){}


}

const SuperWallet: SuperWalletClass = new SuperWalletClass();

export default SuperWallet;
