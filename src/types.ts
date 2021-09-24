import { BigNumber } from "bignumber.js";
import { ApeEngine } from "./engine/apeEngine";

export interface AppState {
  buttonState: 'none' | 'start' | 'pause' | 'stop' | 'panicSell';
  apeLoaded: null | string;
  runningApes: ApeEngine[];
}


export interface Balance {
    chain: string;
    ethBalance: string;
    [tokens: string]: string;
  }

  export interface Position {
    amountCoin: BigNumber;
    amountToken: BigNumber;
  }
  
  export interface Transaction {
    side: "buy" | "sell" | 'approve' | 'sync';
    time: number;
    amountCoin: string;
    amountToken: string;
  }
  
  export interface TokenContractOptions {
    buyPrice?: string | null;
    sellPrice?: string | null;
    apeTime?: Date;
    maxPositionCoin?: string;
    overwritePlugin?: string;
  }

  export interface TokenContract {
    chain: string;
    address: string;
    name: string;
    totalSupply: string;
    intTotalSupply: number;
    decimals: number;
    isApproved: boolean;
    maxPositionCoin: string;
    position: Position;
    transactions: Transaction[];
    // Trade settings
    buyPrice?: string | null;
    sellPrice?: string | null;
    apeTime?: Date;
    // Calculated
    tokenPrice?: string;
    liquidityCoinAmount?: string;
    // Extra
    overwritePlugin?: string;
  }

  export interface ApeContract {
    chain?: string;
    address: string;
    name: string;
    totalSupply: string;
    intTotalSupply: number;
    decimals: number;
    buyPrice?: string | null;
    sellPrice?: string | null;
    apeTime?: Date;
  }
  

  export interface EngineEvent {
    type: 'lpCheck' | 'balanceCheck' | 'walletCheck' | 'apeBuyFail' | 'apeBuySuccess' | 'apeExitCheck' | 'apeApprove';
    chain?: string;
    address: string;
  }


  export interface TradeEvent {
    type: 'buy' | 'sell' | 'approve';
    chain: string;
    address: string;
    amountCoin?: string;
    minToken?: string;
    amountToken?: string;
    minCoint?: string;
  }