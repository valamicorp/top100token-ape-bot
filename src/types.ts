import { BigNumber } from 'bignumber.js';
import { ERC20TokenData } from './blockchain/utilities/erc20';
import { ApeEngine } from './engine/apeEngine';

export interface AppState {
  buttonState: 'none' | 'start' | 'pause' | 'stop' | 'panicSell';
  syncStared: boolean;
  runningApes: ApeEngine[];
  privateKey: string;
  settings: {
    chainId: string;
    apeAmount: string;
    minProfit: string;
    gasPrice: string;
    gasLimit: string;
  };
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
  side: 'buy' | 'sell' | 'approve' | 'sync';
  time: number;
  amountCoin: string;
  amountToken: string;
}

export interface TokenContractOptions {
  buyPrice?: string | null;
  sellPrice?: string | null;
  apeTime?: Date;
  apeAmount?: string;
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
  apeAmount: string;
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

export enum ApeOrderStatus {
  created = 0,
  buyStart = 1,
  buySuccess = 2,
  approvedStart = 3,
  approvedSuccess = 4,
  waitForExit = 5,
  sellStart = 6,
  sellSuccess = 7,
  finished = 8,
  stopped = 999,
}

export interface ApeOrder {
  chain: string;
  address: string;
  erc20Data: ERC20TokenData | undefined;
  apeAmount: string;
  tokenBalance: string;
  minProfit: number;
  currProfit: string;
  isApproved: boolean;
  stopped: boolean;
  error: string | undefined;
  status: ApeOrderStatus;
  createdAt: number;
}

export interface TransactionsDB {
  chain: string;
  address: string;
  side: string;
  time: number;
  amountCoin: string;
  amountToken: string;
}

export interface ApeHistoryDB {
  chain: string;
  data: string;
}

export type StorageTables = 'transactions' | 'apeHistory' | 'none';
