import { BigNumber } from 'bignumber.js';
import { ERC20TokenData } from './blockchain/utilities/erc20';
import { ApeEngine } from './engine/apeEngine';

export interface ChainData {
  id: string;
  name: string;
  slug: string;
  logo: string;
  scanLogo: string;
  router: string;
  factory: string;
  defaultGas: string;
  rcpAddress: string;
  wCoin: string;
  testContract: string;
  honeyChecker: string;
}

export interface AppState {
  buttonState: 'none' | 'start' | 'pause' | 'stop' | 'panicSell';
  selectedToken: SelectedToken | undefined;
  syncStared: boolean;
  runningApes: ApeEngine[];
  privateKey: string;
  settings: {
    chainId: string;
    apeAmount: string;
    minProfit: string;
    gasPrice: string;
    gasLimit: string;
    maxSlippage: string;
  };
}

export interface SelectedToken {
  chainId: string;
  address: string;
  symbol: string;
  name: string;
  totalSupply: string;
  intTotalSupply: number;
  decimals: number;
  balanceReal?: string;
  balance?: string;
  buyTax?: number;
  sellTax?: number;
  isHoneypot?: number;
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
  slippage: number;
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

export interface ApeHistoryDB {
  chain: string;
  data: string;
}

export interface erc20DB {
  chain: string;
  address: string;
  symbol: string;
  name: string;
  totalSupply: string;
  intTotalSupply: number;
  decimals: number;
}

export type StorageTables = 'transactions' | 'apeHistory' | 'erc20Data' | 'none';
