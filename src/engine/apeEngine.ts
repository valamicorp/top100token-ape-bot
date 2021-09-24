import BigNumber from 'bignumber.js';
import Web3 from 'web3';

import { approveInfinity } from '../contants';

import { ApeContract, Balance, EngineEvent } from '../types';

import { SwapWallet } from '../blockchain/swapWallet';

import {EventEmitter} from 'eventemitter3';

export class ApeEngine extends EventEmitter {
  private updateInterval: NodeJS.Timeout;

  private swapWallet: SwapWallet;

  private Balance: Balance;

  private Events: EngineEvent[] = [];

  private Contract?: ApeContract;
  private maxPositionCoin: string;

  public minProfit: number;

  private lastState = '';
  public state = 'Wait for buy!';

  public isApproved = false;
  public isSelling = false;

  public paused = false;

  public swapValue = '0';

  public currProfit = '0.00%';

  constructor(
    chainId: string,
    privateKey: string,
    maxPositionCoin = '0.1',
    minProfitPct = '50',
    gasprice?: string,
    gasLimit?: string,
    updateTimeout = 300,
    injectWallet?: SwapWallet,
   
  ) {
    super();
    this.swapWallet = injectWallet || new SwapWallet(chainId, privateKey,gasprice,gasLimit);

    this.Balance = {
      chain: this.swapWallet.chainData.id,
      ethBalance: '0',
    };

    this.maxPositionCoin = Web3.utils.toWei(maxPositionCoin, 'ether');

    this.minProfit = Number(minProfitPct) / 100;

    this.updateInterval = setInterval(async () => {
      if (this.state !== this.lastState) {
        console.log(this.state);
        this.lastState = this.state;
      }

      if (this.paused) {
        return;
      }

      const e = this.Events.shift();

      if (e) {
        switch (e.type) {
          case 'apeBuyFail':
            this.HandleApeBuyEvent(e.address);
            break;
          case 'apeBuySuccess':
            this.HandleApeSuccess(e.address);
            break;
          case 'apeApprove':
            this.HandleApeApprove(e.address);
            break;
          case 'apeExitCheck':
            this.HandleApeExitCheck(e.address);
            break;
        }
      }
    }, updateTimeout);
  }

  public PauseApe() {
    this.paused = !this.paused;
  }

  public StopApe() {
    this.paused = true;
    clearInterval(this.updateInterval);
  }

  public PanicSell() {
    this.minProfit = -0.99;
  }

  async AddNewApe(address: string) {
    await this.HandleApeBuyEvent(address);
  }

  async HandleApeSuccess(address: string) {
    try {

      const basicData = await this.swapWallet.GetERC20Data(address);
  
      const contractData = {
        address,
        ...basicData,
      };
  
      this.Contract = contractData;
    } catch (error) {
      console.log(error);

      this.Events.push({
        type: 'apeBuySuccess',
        address,
      });
    }

  }

  async HandleApeExitCheck(address: string) {
    try {
      const tokenBalance = await this.swapWallet.BalanceOfErc20(address);
      const swapValue = await this.swapWallet.GetApeSwapValue(address, tokenBalance);

      this.swapValue = swapValue;

      const kindofProfit = new BigNumber(swapValue)
        .dividedBy(new BigNumber(this.maxPositionCoin))
        .multipliedBy(100)
        .toNumber();

      if(Number(this.swapValue)!== 0){
        this.currProfit = `${Number(Math.round(kindofProfit * 100) / 100 - 100)
          .toFixed(2)
          .toString()}%`;
      }


      if (
        new BigNumber(swapValue).isGreaterThan(new BigNumber(this.maxPositionCoin).multipliedBy(1 + this.minProfit))
      ) {
        if(!this.isSelling){
          await this.HandleApeSell(address, tokenBalance);
        }
        

        return;
      }
    } catch (error) {
      console.log(error);
    } finally {
      this.Events.push({
        type: 'apeExitCheck',
        address,
      });
    }
  }


  private async HandleApeBuyEvent(address: string): Promise<any> {
    try {
      this.state = 'APE BUY STARTED!';

      const data = await this.swapWallet.SwapExactETHForTokens(address);

      const singedTx = await this.swapWallet.CreateSignedTx(data, {
        to: this.swapWallet.chainData.router,
        value: this.maxPositionCoin,
      });

      const receipt = await this.swapWallet.SendSignedTx(singedTx);

      if (receipt) {
        this.state = 'APE BUY SUCCESS!';

        this.Events.push({
          type: 'apeApprove',
          address,
        });

        this.Events.push({
          type: 'apeBuySuccess',
          address,
        });

        this.Events.push({
          type: 'apeExitCheck',
          address,
        });
      } else {
        throw new Error('Transaction failed!');
      }
    } catch (error) {
      console.log(error);

      this.state = 'APE BUY ERROR, RETRY!';

      this.Events.push({
        type: 'apeBuyFail',
        address,
      });
      return;
    }
  }

  private async HandleApeApprove(address: string): Promise<any> {
    try {
      this.state = 'APE APPROVE STARTED!';

      const data = await this.swapWallet.ApproveErc20(address, this.swapWallet.chainData.router, approveInfinity);

      const singedTx = await this.swapWallet.CreateSignedTx(data, {
        to: address,
      });

      const receipt = await this.swapWallet.SendSignedTx(singedTx);

      if (receipt) {
        this.state = 'APE APPROVE FINISHED!';
        this.isApproved = true;
      } else {
        throw new Error('Transaction failed!');
      }
    } catch (error) {
      console.log(error);

      this.state = 'APE APPROVE FAILED RETRY!';

      this.Events.push({
        type: 'apeApprove',
        address,
      });
      return;
    }
  }

  private async HandleApeSell(address: string, tokenBalance: string): Promise<any> {
    try {
      if (!this.isApproved) {
        this.Events.push({
          type: 'apeExitCheck',
          address,
        });
        return;
      }

      this.state = 'APE SELL STARTED!';
      this.isSelling = true;

      const data = await this.swapWallet.SwapExactTokensForETH(address, tokenBalance);

      const singedTx = await this.swapWallet.CreateSignedTx(data, {
        to: this.swapWallet.chainData.router,
      });

      const receipt = await this.swapWallet.SendSignedTx(singedTx);

      if (receipt) {
        this.state = 'APE SELL FINISHED!';
        this.StopApe();
      } else {
        throw new Error('Transaction failed!');
      }
    } catch (error) {
      console.log(error);

      this.state = 'APE SELL FAILED, RETRY!';

      this.Events.push({
        type: 'apeExitCheck',
        address,
      });
      return;
    }
  }
}
