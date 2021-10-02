import Web3 from 'web3';
import { SwapWallet } from '../../blockchain/swapWallet';
import { ethereumChains } from '../../contants';
import { ApeEngine } from '../../engine/apeEngine';

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

describe('APE Trade Engine', () => {
  beforeEach(() => {
    events = [];
  });

  it('should create a TradeEngine', async () => {
    const engine = new ApeEngine(CHAIN_ID, 'privateKey', '0.1', '50', undefined, undefined, 100, mockWallet);

    engine.StopApe();

    expect(engine).toBeInstanceOf(ApeEngine);
  });

  it('should be Paused', async () => {
    const engine = new ApeEngine(CHAIN_ID, 'privateKey', '0.1', '50', undefined, undefined, 100, mockWallet);

    engine.PauseApe();
    expect(engine.paused).toBe(true);
    engine.PauseApe();
    expect(engine.paused).toBe(false);
    engine.StopApe();
  });

  it('should be InstantBuyApe buy', async () => {
    const engine = new ApeEngine(CHAIN_ID, 'privateKey', '0.1', '50', undefined, undefined, 100, mockWallet);

    engine.InstantBuyApe(APE_ADDRESS);

    expect(engine.currProfit).toBe('0.00%');
    expect(engine.paused).toBe(false);
    expect(engine.state).toBe('APE BUY STARTED!');
    expect(engine.currProfit).toBe('0.00%');
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(engine.currProfit).toBe('0.00%');
    expect(engine.state).toBe('APE APPROVE STARTED!');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(engine.swapValue).toBe(Web3.utils.toWei('0.08', 'ether'));
    expect(engine.currProfit).toBe('-20.00%');
    expect(engine.state).toBe('APE APPROVE FINISHED!');
    expect(engine.currProfit).toBe('-20.00%');

    engine.StopApe();
  });

  it('should be InstantBuyApe sell', async () => {
    const engine = new ApeEngine(CHAIN_ID, 'privateKey', '0.1', '50', undefined, undefined, 100, mockWallet);

    engine.InstantBuyApe(APE_ADDRESS);

    (mockWallet.GetApeSwapValue = async (...args) => {
      events.push({ name: 'GetApeSwapValue', args: [...args] });
      return Web3.utils.toWei('0.5', 'ether');
    }),
      expect(engine.currProfit).toBe('0.00%');
    expect(engine.paused).toBe(false);
    expect(engine.state).toBe('APE BUY STARTED!');
    expect(engine.currProfit).toBe('0.00%');
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(engine.currProfit).toBe('0.00%');
    expect(engine.state).toBe('APE APPROVE STARTED!');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(engine.swapValue).toBe(Web3.utils.toWei('0.5', 'ether'));
    expect(engine.currProfit).toBe('400.00%');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    expect(engine.state).toBe('APE SELL FINISHED!');

    engine.StopApe();
  });
});
