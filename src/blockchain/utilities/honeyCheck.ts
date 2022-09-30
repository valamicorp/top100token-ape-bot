import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { honeyCheckerAbi } from '../../abi/honeyChecker';

export class HoneyChecker {
  constructor(private web3: Web3) {}

  async RunHoneyContract({
    from: string,
    honeyCheckerAddress: string,
    token: string,
    router: string,
    rcpAddress: string,
  }) {
    let buyTax = 0;
    let sellTax = 0;
    let buyGasCost = 0;
    let sellGasCost = 0;
    let isHoneypot = 0;

    const web3 = this.web3;
    const gasPrice = await web3.eth.getGasPrice();

    const honeyCheck = new web3.eth.Contract(honeyCheckerAbi as any);

    const data = honeyCheck.methods.honeyCheck(token, router).encodeABI();

    let honeyTxResult: any;

    try {
      honeyTxResult = await web3.eth.call({
        // this could be provider.addresses[0] if it exists
        from,
        // target address, this could be a smart contract address
        to: honeyCheckerAddress,
        // optional if you want to specify the gas limit
        gas: GAS_LIMIT,
        gasPrice: Math.floor(Number(gasPrice) * 1.2).toString(),
        // optional if you are invoking say a payable function
        value: TEST_AMOUNT,
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
    sellTax = (1 - new BigNumber(res.sellResult).dividedBy(new BigNumber(TEST_AMOUNT)).toNumber()) * 100 - buyTax;

    return {
      buyTax,
      sellTax,
      buyGasCost,
      sellGasCost,
      isHoneypot,
    };
  }
}
