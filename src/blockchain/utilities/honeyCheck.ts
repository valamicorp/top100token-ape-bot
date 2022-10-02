import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { honeyCheckerAbi } from '../../abi/honeyChecker';

const GAS_LIMIT = '4500000'; // 4.5 million Gas should be enough

export class HoneyChecker {
  constructor(private web3: Web3) {}

  async RunHoneyContract(options: {
    from: string;
    amount: string;
    token: string;
    honeyCheckerAddress: string;
    router: string;
    gasPrice: string;
  }) {
    let buyTax = 0;
    let sellTax = 0;
    let buyGasCost = 0;
    let sellGasCost = 0;
    let isHoneypot = 0;

    const web3 = this.web3;

    const honeyCheck = new web3.eth.Contract(honeyCheckerAbi as any);

    const data = honeyCheck.methods.honeyCheck(options.token, options.router).encodeABI();

    let honeyTxResult: any;

    try {
      honeyTxResult = await web3.eth.call({
        // this could be provider.addresses[0] if it exists
        from: options.from,
        // target address, this could be a smart contract address
        to: options.honeyCheckerAddress,
        // optional if you want to specify the gas limit
        gas: GAS_LIMIT,
        gasPrice: options.gasPrice,
        // optional if you are invoking say a payable function
        value: options.amount,
        // nonce
        nonce: undefined,
        // this encodes the ABI of the method and the arguements
        data,
      });
    } catch (error) {
      return {
        buyTax: -1,
        sellTax: -1,
        isHoneypot: 1,
        error: error,
      };
    }

    const decoded = web3.eth.abi.decodeParameter(
      'tuple(uint256,uint256,uint256,uint256,uint256,uint256)',
      honeyTxResult,
    );

    buyGasCost = decoded[3];
    sellGasCost = decoded[4];

    const res = {
      buyResult: decoded[0],
      leftOver: decoded[1],
      sellResult: decoded[2],
      expectedAmount: decoded[5],
    };

    buyTax = (1 - new BigNumber(res.buyResult).dividedBy(new BigNumber(res.expectedAmount)).toNumber()) * 100;
    sellTax = (1 - new BigNumber(res.sellResult).dividedBy(new BigNumber(options.amount)).toNumber()) * 100 - buyTax;

    return {
      expectedBuyAmount: res.expectedAmount,
      buyTax: buyTax.toFixed(1),
      sellTax: sellTax.toFixed(1),
      buyGasCost,
      sellGasCost,
      isHoneypot,
    };
  }
}
