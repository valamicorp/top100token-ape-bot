import { EventEmitter } from 'eventemitter3';
import Web3 from 'web3';
import Logger from '../../util/logger';

export class Web3Tx extends EventEmitter {
  constructor(private web3: Web3) {
    super();
  }

  public async Send(singedTx: string) {
    return new Promise((resolve, reject) => {
      this.on('error', (error) => {
        Logger.log('Tx Receipt error, ', error);
        reject(error);
      });

      this.on('receipt', (receipt) => {
        resolve(receipt);
      });

      this.on('txCheck', (txHash) => {
        this.WaitForReceipt(txHash);
      });

      this.SendTx(singedTx);
    });
  }

  private SendTx(singedTx: string) {
    this.web3.eth.sendSignedTransaction(singedTx, (err, txHash) => {
      if (err) {
        this.emit('error', err);
        return;
      }

      this.emit('txCheck', txHash);
    });
  }

  private WaitForReceipt(hash: string, retry = 0) {
    this.web3.eth.getTransactionReceipt(hash, async (err, receipt) => {
      Logger.log(`Transaction wait for receipt`, {
        hash,
        retry,
      });

      if (err || retry >= 50) {
        this.emit('error', err || 'Retry limit reached');
        return;
      }

      if (receipt !== null) {
        this.emit('receipt', receipt);
        return;
      }

      retry += 1;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      return this.WaitForReceipt(hash, retry);
    });
  }
}
