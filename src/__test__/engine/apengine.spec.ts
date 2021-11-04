import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { SwapWallet } from '../../blockchain/swapWallet';
import { ethereumChains } from '../../contants';
import { ApeEngine } from '../../engine/apeEngine';

BigNumber.set({ EXPONENTIAL_AT: 80 });

const CHAIN_ID = 'cth';
const APE_ADDRESS = '0xa34273ce752f5a8e926fa213bb08728b2387e8f5';

const chainData = ethereumChains.find((e) => e.id === CHAIN_ID);

let events: any[] = [];

const mockWallet = {
  chainData: chainData,
  SwapExactETHForTokens: async (...args) => {
    events.push({ name: 'SwapExactETHForTokens', args: [...args] });
  },
  SwapExactTokensForETH: async (...args) => {
    events.push({ name: 'SwapExactTokensForETH', args: [...args] });
  },
  CreateSignedTx: async (...args) => {
    events.push({ name: 'CreateSignedTx', args: [...args] });
  },
  SendSignedTx: async (...args) => {
    events.push({ name: 'SendSignedTx', args: [...args] });
    await new Promise((resolve) => setTimeout(resolve, 500));
    return 'done';
  },
  BalanceOfErc20: async (...args) => {
    events.push({ name: 'BalanceOfErc20', args: [...args] });
    return '1000000000';
  },
  GetLiquidityAddress: async (...args) => {
    return '0x00000000000000000';
  },
  GetLiquidityAmount: async (...args) => {
    return new BigNumber('100000000000000000000000000');
  },
  AllowanceErc20: async (...args) => {
    return Web3.utils.toWei('0.08', 'ether');
  },
  GetApeSwapValue: async (...args) => {
    events.push({ name: 'GetApeSwapValue', args: [...args] });
    return Web3.utils.toWei('0.08', 'ether');
  },
  ApproveErc20: async (...args) => {
    events.push({ name: 'ApproveErc20', args: [...args] });
    return 'done';
  },
  GetEthBalance: async (...args) => {
    events.push({ name: 'GetEthBalance', args: [...args] });
    return '1000000';
  },
  GetERC20Data: async (...args) => {
    events.push({ name: 'GetERC20Data', args: [...args] });
    return {};
  },
} as any as SwapWallet;

const apeSettings = {
  chainId: CHAIN_ID,
  privateKey: 'privateKey',
  apeAmount: '0.1',
  minProfitPct: '50',
  updateTimeout: 100,
  injectWallet: mockWallet,
};

describe('APE Trade Engine', () => {
  beforeEach(() => {
    events = [];
  });

  it('should create a TradeEngine', async () => {
    const engine = new ApeEngine(apeSettings);

    engine.StopApe();

    expect(engine).toBeInstanceOf(ApeEngine);
  });

  it('should be Paused', async () => {
    const engine = new ApeEngine(apeSettings);

    engine.PauseApe();
    expect(engine.paused).toBe(true);
    engine.PauseApe();
    expect(engine.paused).toBe(false);
    engine.StopApe();
  });

  it('should be InstantBuyApe buy', async () => {
    const engine = new ApeEngine(apeSettings);

    engine.SafeBuyApe(APE_ADDRESS);

    expect(engine.currProfit).toBe('0.00%');
    expect(engine.paused).toBe(false);
    expect(engine.state).toBe('APE WAIT FOR LIQUDITY!');
    expect(engine.currProfit).toBe('0.00%');
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(engine.currProfit).toBe('0.00%');
    expect(engine.state).toBe('APE APPROVE FINISHED!');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(engine.swapValue).toBe(Web3.utils.toWei('0.08', 'ether'));
    expect(engine.currProfit).toBe('-20.00%');
    expect(engine.state).toBe('APE APPROVE FINISHED!');
    expect(engine.currProfit).toBe('-20.00%');

    engine.StopApe();
  });

  it('should be InstantBuyApe sell', async () => {
    const engine = new ApeEngine(apeSettings);

    engine.SafeBuyApe(APE_ADDRESS);

    (mockWallet.GetApeSwapValue = async (...args) => {
      events.push({ name: 'GetApeSwapValue', args: [...args] });
      return Web3.utils.toWei('0.5', 'ether');
    }),
      expect(engine.currProfit).toBe('0.00%');
    expect(engine.paused).toBe(false);
    expect(engine.state).toBe('APE WAIT FOR LIQUDITY!');
    expect(engine.currProfit).toBe('0.00%');
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(engine.currProfit).toBe('0.00%');
    expect(engine.state).toBe('APE APPROVE FINISHED!');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(engine.swapValue).toBe(Web3.utils.toWei('0.5', 'ether'));
    expect(engine.currProfit).toBe('400.00%');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    expect(engine.state).toBe('APE SELL FINISHED!');

    engine.StopApe();
  });
});
