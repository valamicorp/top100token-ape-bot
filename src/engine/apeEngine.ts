import BigNumber from 'bignumber.js';
import Web3 from 'web3';

BigNumber.set({ EXPONENTIAL_AT: 80 });

import { approveInfinity } from '../contants';

import { ApeContract, ApeOrder, ApeOrderStatus, Balance, EngineEvent, ApeHistoryDB } from '../types';

import { SwapWallet } from '../blockchain/swapWallet';

import { EventEmitter } from 'eventemitter3';
import { ERC20TokenData } from '../blockchain/utilities/erc20';
import Logger from '../util/logger';
import SQL from '../util/sqlStorage';

export interface ApeEngineSettings {
  chainId: string;
  privateKey: string;
  apeAmount: string;
  minProfitPct: string;
  gasprice?: string;
  gasLimit?: string;
  updateTimeout?: number;
  injectWallet?: SwapWallet;
}

export class ApeEngine extends EventEmitter {
  public orderStatus = ApeOrderStatus.created;

  private retryTimeout = 5000;

  private maxBuyRetry = 5;
  private maxApproveRerty = 5;
  private maxSellRetry = 5;

  private currBuyRetry = 0;
  private currApproveRerty = 0;
  private currSellRetry = 0;

  public contractAddress = '';

  public liqudityAddress?: string;

  private updateInterval?: NodeJS.Timeout;

  private swapWallet: SwapWallet;

  private Balance: Balance;

  private Events: EngineEvent[] = [];

  private Contract?: ApeContract;
  private apeAmount: string;

  public minProfit: number;

  private lastState = '';
  public state = 'Wait for buy!';

  public isApproved = false;
  public isSelling = false;

  public paused = false;

  public swapValue = '0';

  public currProfit = '0.00%';

  public erc20Data: ERC20TokenData | undefined;

  public createdAt = Date.now();

  constructor(settings: ApeEngineSettings) {
    super();

    this.swapWallet =
      settings.injectWallet ||
      new SwapWallet(settings.chainId, settings.privateKey, settings.gasprice, settings.gasLimit);

    this.Balance = {
      chain: this.swapWallet.chainData.id,
      ethBalance: '0',
    };

    this.apeAmount = Web3.utils.toWei(settings.apeAmount, 'ether');

    this.minProfit = Number(settings.minProfitPct) / 100;

    this.CreateEventQueue(settings.updateTimeout || 800);
  }

  public SnapshotApe(): ApeOrder {
    return {
      chain: this.swapWallet.chainData.id,
      address: this.contractAddress,
      erc20Data: this.erc20Data,
      apeAmount: this.apeAmount,
      tokenBalance: this.Balance[this.contractAddress],
      minProfit: this.minProfit,
      currProfit: this.currProfit,
      isApproved: this.isApproved,
      stopped: false,
      error: undefined,
      status: this.orderStatus,
      createdAt: this.createdAt,
    };
  }

  public PauseApe() {
    this.paused = !this.paused;
  }

  public StopApe() {
    this.paused = true;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    // Save forced stop status
    if (this.orderStatus !== ApeOrderStatus.finished) {
      this.orderStatus = ApeOrderStatus.stopped;
    }
  }

  public PanicSell() {
    this.minProfit = -0.99;
  }

  public SetMinProfit(minProfit: number) {
    this.minProfit = minProfit;
  }

  async SafeBuyApe(address: string) {
    this.contractAddress = address;
    await this.HandleSafeBuyApe();
  }

  async InstantBuyApe(address: string) {
    this.contractAddress = address;
    this.UpdateERC20(address);
    await this.HandleApeBuyEvent(address);
  }

  public async LoadSnapshotApe(apeOrder: ApeOrder) {
    this.contractAddress = apeOrder.address;
    this.Balance[apeOrder.address] = apeOrder.tokenBalance;
    this.minProfit = apeOrder.minProfit;
    (this.apeAmount = apeOrder.apeAmount), (this.isApproved = apeOrder.isApproved);
    this.orderStatus = apeOrder.status;
    this.createdAt = apeOrder.createdAt;

    this.erc20Data = apeOrder.erc20Data;

    this.UpdateERC20(apeOrder.address);

    if (!this.isApproved) {
      this.Events.push({
        type: 'apeApprove',
        address: apeOrder.address,
      });
    }

    this.Events.push({
      type: 'apeExitCheck',
      address: apeOrder.address,
    });
  }

  public CreateEventQueue(speed: number) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      if (this.state !== this.lastState) {
        this.lastState = this.state;
      }

      if (this.paused) {
        return;
      }

      const e = this.Events.shift();

      if (e) {
        switch (e.type) {
          case 'apeBuyFail':
            this.HandleSafeBuyApe();
            break;
          case 'apeBuySuccess':
            this.HandleApeBuySuccess(e.address);
            break;
          case 'apeApprove':
            this.HandleApeApprove(e.address);
            break;
          case 'apeExitCheck':
            this.HandleApeExitCheck(e.address);
            break;
        }
      }
    }, speed);
  }

  async HandleApeBuySuccess(address: string) {
    try {
      const basicData = await this.swapWallet.GetERC20Data(address);

      this.erc20Data = basicData;

      const contractData = {
        address,
        ...basicData,
      };

      this.Contract = contractData;
    } catch (error) {
      Logger.log(error);

      this.Events.push({
        type: 'apeBuySuccess',
        address,
      });
    }
  }

  async HandleSafeBuyApe() {
    try {
      this.state = 'APE WAIT FOR LIQUDITY!';

      if (!this.erc20Data) {
        const basicData = await this.swapWallet.GetERC20Data(this.contractAddress);
        this.erc20Data = basicData;
      }

      if (!this.liqudityAddress) {
        const liqudityAddress = await this.swapWallet.GetLiquidityAddress(this.contractAddress);
        this.liqudityAddress = liqudityAddress;
      }

      if (this.liqudityAddress) {
        const liquidityCoinAmount = await this.swapWallet.GetLiquidityAmount(this.liqudityAddress);

        if (!liquidityCoinAmount.isZero() && !liquidityCoinAmount.isNaN()) {
          Logger.log(`Liquidity found for ${this.contractAddress}, init Buy`);
          // Every check is done we should be able to buy!
          this.HandleApeBuyEvent(this.contractAddress);
          return;
        }
      } else {
        Logger.log(`No Liquidity found for ${this.contractAddress}, wait for LP`);
      }

      this.Events.push({
        type: 'apeBuyFail',
        address: this.contractAddress,
      });
    } catch (error) {
      this.Events.push({
        type: 'apeBuyFail',
        address: this.contractAddress,
      });
      Logger.log(`Error HandleSafeBuyApe ${error}`);
    }
  }

  async HandleApeExitCheck(address: string) {
    try {
      this.orderStatus = ApeOrderStatus.waitForExit;

      const tokenBalance = await this.swapWallet.BalanceOfErc20(address);
      const swapValue = await this.swapWallet.GetApeSwapValue(address, tokenBalance);

      this.Balance[address] = tokenBalance;

      this.swapValue = swapValue;

      const kindofProfit = new BigNumber(swapValue)
        .dividedBy(new BigNumber(this.apeAmount))
        .multipliedBy(100)
        .toNumber();

      if (Number(this.swapValue) !== 0) {
        this.currProfit = `${Number(Math.round(kindofProfit) - 100)
          .toFixed(2)
          .toString()}%`;
      }

      if (new BigNumber(swapValue).isGreaterThan(new BigNumber(this.apeAmount).multipliedBy(1 + this.minProfit))) {
        if (!this.isSelling) {
          await this.HandleApeSell(address, tokenBalance);
        }

        return;
      }
    } catch (error) {
      Logger.log(error);
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
      this.orderStatus = ApeOrderStatus.buyStart;

      if (this.currBuyRetry >= this.maxBuyRetry) {
        this.state = 'APE BUY RETRY LIMIT REACHED, APE STOPPED!';
        this.StopApe();
        return;
      }

      const data = await this.swapWallet.SwapExactETHForTokens(address);

      const singedTx = await this.swapWallet.CreateSignedTx(data, {
        to: this.swapWallet.chainData.router,
        value: this.apeAmount,
      });

      const receipt = await this.swapWallet.SendSignedTx(singedTx);

      if (receipt) {
        this.state = 'APE BUY SUCCESS!';
        this.orderStatus = ApeOrderStatus.buySuccess;

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
      Logger.log(error);

      this.state = 'APE BUY ERROR, RETRY!';

      this.currBuyRetry += 1;

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
      this.orderStatus = ApeOrderStatus.approvedStart;

      const tokenBalance = await this.swapWallet.BalanceOfErc20(address);

      if (new BigNumber(tokenBalance).isZero()) {
        throw new Error('Cannot Approve Token Balance is 0');
      }

      const allowed = await this.swapWallet.AllowanceErc20(address);

      if (allowed > 0) {
        this.state = 'APE APPROVE FINISHED!';
        this.isApproved = true;
        this.orderStatus = ApeOrderStatus.approvedSuccess;
        return;
      }

      if (this.currApproveRerty >= this.maxApproveRerty) {
        this.state = 'APE APPROVE, RETRY LIMIT REACHED, APE STOPPED!';
        this.StopApe();
        return;
      }

      const data = await this.swapWallet.ApproveErc20(address, this.swapWallet.chainData.router, approveInfinity);

      const singedTx = await this.swapWallet.CreateSignedTx(data, {
        to: address,
      });

      const receipt = await this.swapWallet.SendSignedTx(singedTx);

      if (receipt) {
        this.state = 'APE APPROVE FINISHED!';
        this.isApproved = true;
        this.orderStatus = ApeOrderStatus.approvedSuccess;
      } else {
        throw new Error('Transaction failed!');
      }
    } catch (error) {
      Logger.log(error);

      this.state = 'APE APPROVE FAILED RETRY!';

      this.currApproveRerty += 1;

      await new Promise((resolve) => setTimeout(resolve, this.retryTimeout));

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

      if (this.currSellRetry >= this.maxSellRetry) {
        this.state = 'APE SELL, RETRY LIMIT REACHED, APE STOPPED!';
        this.StopApe();
        return;
      }

      this.state = 'APE SELL STARTED!';
      this.orderStatus = ApeOrderStatus.sellStart;
      this.isSelling = true;

      const data = await this.swapWallet.SwapExactTokensForETH(address, tokenBalance);

      const singedTx = await this.swapWallet.CreateSignedTx(data, {
        to: this.swapWallet.chainData.router,
      });

      const receipt = await this.swapWallet.SendSignedTx(singedTx);

      if (receipt) {
        this.state = 'APE SELL FINISHED!';
        this.orderStatus = ApeOrderStatus.sellSuccess;
        this.StopApe();
        this.orderStatus = ApeOrderStatus.finished;

        SQL.InsertData<ApeHistoryDB>(
          {
            chain: this.swapWallet.chainData.id,
            data: JSON.stringify({
              wallet: this.swapWallet.walletAddress,
              contract: this.contractAddress,
              buyAmount: this.apeAmount,
              coinBalance: this.Balance[this.contractAddress],
              expectedProfit: this.currProfit,
              targetProfit: this.minProfit,
              time: Date.now(),
            }),
          },
          'apeHistory',
        );
      } else {
        throw new Error('Transaction failed!');
      }
    } catch (error) {
      Logger.log(error);

      this.state = 'APE SELL FAILED, RETRY!';

      this.currSellRetry += 1;

      await new Promise((resolve) => setTimeout(resolve, this.retryTimeout));

      this.Events.push({
        type: 'apeExitCheck',
        address,
      });
      return;
    }
  }

  private async UpdateERC20(address: string) {
    try {
      const basicData = await this.swapWallet.GetERC20Data(address);

      this.erc20Data = basicData;
    } catch (error) {}
  }
}
