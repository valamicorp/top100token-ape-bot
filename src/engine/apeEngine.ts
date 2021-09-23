import BigNumber from "bignumber.js";
import Web3 from "web3";

import { approveInfinity, ethereumChains } from "../contants";
import {
  ApproveErc20,
  balanceOfErc20,
  getERC20Data,
} from "../blockchain/erc20";
import { Iftt } from "../trading-ai/machine-learning";
import {
  ApeContract,
  Balance,
  EngineEvent,
  TokenContract,
  TokenContractOptions,
  TradeEvent,
  Transaction,
} from "../types";
import { getUniFactory } from "../blockchain/uniFactory";
import {
  getApeSwapValue,
  getUniSwapData,
  swapExactETHForTokens,
  swapExactTokensForETH,
} from "../blockchain/uniSwap";
import {
  createSignedTx,
  getEthBalance,
  sendSignedTx,
} from "../blockchain/walletHandler";
import { StorageService, TransactionsDB } from "../util/storage";
import { calculatePosition } from "../trading-ai/positionHandler";

export class ApeEngine {
  private updateInterval: NodeJS.Timeout;

  private WalletAddress: string;
  private WalletPrivateKey: string;

  private Balances: Balance[] = [];

  private Events: EngineEvent[] = [];

  private Contracts: ApeContract[] = [];
  private maxPositionCoin: string;

  public minProfit: number;

  private lastState = "";
  public state = "Wait for buy!";

  public isApproved = false;

  public paused = false;

  public swapValue = "0";

  public currProfit = "0.00%";

  constructor(
    address: string,
    privateKey: string,
    maxPositionCoin = "0.1",
    minProfitPct = "50"
  ) {
    this.WalletAddress = address;
    this.WalletPrivateKey = privateKey;

    this.maxPositionCoin = Web3.utils.toWei(maxPositionCoin, "ether");

    this.minProfit = Number(minProfitPct) / 100;

    console.log("Min profit :", this.minProfit);

    this.updateInterval = setInterval(async () => {
      if (this.state !== this.lastState) {
        console.log(this.state);
        this.lastState = this.state;
      }

      if (this.paused) {
        return;
      }

      const e = this.Events.pop();

      if (e) {
        switch (e.type) {
          case "walletCheck":
            this.CheckWallet(e.chain);
            break;
          case "apeBuyFail":
            this.HandleApeTradeEvent(e.chain, e.address);
            break;
          case "apeBuySuccess":
            this.HandleApeSuccess(e.chain, e.address);
            break;
          case "apeApprove":
            this.HandleApeApprove(e.chain, e.address);
            break;
          case "apeExitCheck":
            this.HandleApeExitCheck(e.chain, e.address);
            break;
        }
      }
    }, 100);
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

  async AddNewApe(chain: string, address: string) {
    if (!this.Balances.find((e) => e.chain === chain)) {
      this.Balances.push({ chain, ethBalance: "0" });
    }

    await this.HandleApeTradeEvent(chain, address);
  }

  async HandleApeSuccess(chain: string, address: string) {
    const chainData = ethereumChains.find((e) => e.id === chain);

    if (!this.Balances.find((e) => e.chain === chain)) {
      this.Balances.push({ chain, ethBalance: "0" });
    }

    this.CheckWallet(chain);

    if (chainData) {
      const basicData = await getERC20Data(chainData.rcpAddress, address);

      const contractData = {
        chain,
        address,
        ...basicData,
      };

      this.Contracts.push(contractData);
    }
  }

  async HandleApeExitCheck(chain: string, address: string) {
    try {
      const chainData = ethereumChains.find((e) => e.id === chain);
      const balance = this.Balances.find((e) => e.chain === chain);

      if (chainData && balance) {
        const tokenBalance = await balanceOfErc20(
          chainData.rcpAddress,
          address,
          this.WalletAddress
        );

        const swapValue = await getApeSwapValue(
          chainData.rcpAddress,
          chainData.router,
          chainData.wCoin,
          address,
          tokenBalance
        );

        this.swapValue = swapValue;

        const kindofProfit = new BigNumber(swapValue)
          .dividedBy(new BigNumber(this.maxPositionCoin))
          .multipliedBy(100)
          .toNumber();

        this.currProfit = `${Number(Math.round(kindofProfit * 100) / 100 - 100)
          .toFixed(2)
          .toString()}%`;

        if (
          new BigNumber(swapValue).isGreaterThan(
            new BigNumber(this.maxPositionCoin).multipliedBy(1 + this.minProfit)
          )
        ) {
          await this.HandleApeSell(chain, address, tokenBalance);

          return;
        }
      }
    } catch (error) {
    } finally {
      this.Events.push({
        type: "apeExitCheck",
        chain,
        address,
      });
    }
  }

  UpdateBalance(chain: string, address: string) {
    this.Events.push({ type: "lpCheck", chain, address });
    this.Events.push({ type: "balanceCheck", chain, address });
  }

  private async CheckWallet(chain: string) {
    try {
      const chainData = ethereumChains.find((e) => e.id === chain);

      if (chainData) {
        const balanceEth = await getEthBalance(
          chainData.rcpAddress,
          this.WalletAddress
        );

        const userBalance = this.Balances.find((i) => i.chain === chain);

        if (userBalance) {
          userBalance.ethBalance = balanceEth;
        }
      }
    } catch (error) {
      console.log(error);

      return false;
    }
  }

  private async HandleApeTradeEvent(
    chain: string,
    address: string
  ): Promise<any> {
    try {
      this.state = "APE BUY STARTED!";

      const chainData = ethereumChains.find((e) => e.id === chain);

      if (chainData) {
        const data = swapExactETHForTokens(
          chainData.router,
          chainData.wCoin,
          address, // address
          this.WalletAddress
        );

        const singed = await createSignedTx(
          chainData.rcpAddress,
          this.WalletPrivateKey,
          data,
          {
            from: this.WalletAddress,
            to: chainData.router,
            value: this.maxPositionCoin,
          }
        );

        const receipt = await sendSignedTx(
          chainData.rcpAddress,
          this.WalletPrivateKey,
          singed
        );

        if (receipt) {
          this.state = "APE BUY SUCCESS!";

          this.Events.push({
            type: "apeBuySuccess",
            chain,
            address,
          });

          this.Events.push({
            type: "apeApprove",
            chain,
            address,
          });

          this.Events.push({
            type: "apeExitCheck",
            chain,
            address,
          });
        } else {
          throw new Error("Transaction failed!");
        }
      }
    } catch (error) {
      console.log(error);

      this.state = "APE BUY ERROR, RETRY!";

      this.Events.push({
        type: "apeBuyFail",
        chain,
        address,
      });
      return;
    }
  }

  private async HandleApeApprove(chain: string, address: string): Promise<any> {
    try {
      const chainData = ethereumChains.find((e) => e.id === chain);

      this.state = "APE APPROVE STARTED!";

      if (chainData) {
        const dataAprove = ApproveErc20(
          address,
          chainData.router,
          approveInfinity
        );

        const singedApprove = await createSignedTx(
          chainData.rcpAddress,
          this.WalletPrivateKey,
          dataAprove,
          { from: this.WalletAddress, to: address }
        );

        const receiptApprove = await sendSignedTx(
          chainData.rcpAddress,
          this.WalletPrivateKey,
          singedApprove
        );

        if (receiptApprove) {
          this.state = "APE APPROVE FINISHED!";
          this.isApproved = true;
        } else {
          throw new Error("Transaction failed!");
        }
      }
    } catch (error) {
      console.log(error);

      this.state = "APE APPROVE FAILED RETRY!";

      this.Events.push({
        type: "apeApprove",
        chain,
        address,
      });
      return;
    }
  }

  private async HandleApeSell(
    chain: string,
    address: string,
    tokenBalance: string
  ): Promise<any> {
    try {
      if (!this.isApproved) {
        this.Events.push({
          type: "apeExitCheck",
          chain,
          address,
        });
        return;
      }

      const chainData = ethereumChains.find((e) => e.id === chain);

      this.state = "APE SELL STARTED!";

      if (chainData) {
        const data = swapExactTokensForETH(
          chainData.router,
          chainData.wCoin,
          address,
          this.WalletAddress,
          tokenBalance
        );

        const singed = await createSignedTx(
          chainData.rcpAddress,
          this.WalletPrivateKey,
          data,
          {
            from: this.WalletAddress,
            to: chainData.router,
          }
        );

        const receipt = await sendSignedTx(
          chainData.rcpAddress,
          this.WalletPrivateKey,
          singed
        );

        if (receipt) {
          this.state = "APE SELL FINISHED!";
        } else {
          throw new Error("Transaction failed!");
        }
      }
    } catch (error) {
      console.log(error);

      this.state = "APE SELL FAILED, RETRY!";

      this.Events.push({
        type: "apeExitCheck",
        chain,
        address,
      });
      return;
    }
  }
}
