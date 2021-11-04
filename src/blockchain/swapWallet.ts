const Store = require('electron-store');

const store = new Store({
  encryptionKey: 'The old apple revels in its authority',
});

import Web3 from 'web3';
import BigNumber from 'bignumber.js';

BigNumber.set({ EXPONENTIAL_AT: 80 });

const erc20abi = require('erc-20-abi');

import { ethereumChains } from '../contants';
import { ERC20TokenData } from './utilities/erc20';
import { AddressFromPrivatekey, TxConfing } from './utilities/walletHandler';
import { uniSwap2ABI } from '../abi/uniSwap2';
import Logger from '../util/logger';
import SuperWallet from './superWallet';
import { uniFactoryABI } from '../abi/uniswapFactory';
import { Web3Tx } from './utilities/transactionHandler';

export class SwapWallet {
  public chainData: {
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
    contractExplorer: (address: string) => string;
    chartLink: (address: string) => string;
    swapLink: (address: string) => string;
  };
  private web3: Web3;
  public walletAddress: string;
  public gasPrice: string;
  public gasLimit: string;
  public customProvider?: string;

  constructor(chainId: string, private walletPrivateKey: string, gasPrice?: string, gasLimit?: string) {
    const chainData = ethereumChains.find((e) => e.id === chainId);

    if (chainData) {
      this.chainData = chainData;

      let provider: any = new Web3.providers.HttpProvider(this.chainData.rcpAddress);

      if (store.has('customRPC') && store.get('customRPC') !== '') {
        this.customProvider = store.get('customRPC');

        if (this.customProvider?.includes('https://')) {
          provider = new Web3.providers.HttpProvider(this.customProvider);
        }
        if (this.customProvider?.includes('wss://')) {
          provider = new Web3.providers.WebsocketProvider(this.customProvider);
        }
      }

      this.web3 = new Web3(provider);

      this.walletAddress = AddressFromPrivatekey(this.walletPrivateKey);
      this.gasPrice =
        gasPrice && !new BigNumber(gasPrice).isNaN() ? Web3.utils.toWei(gasPrice, 'gwei') : chainData.defaultGas;
      this.gasLimit = gasLimit && !new BigNumber(gasLimit).isNaN() ? new BigNumber(gasLimit).toString() : '1600000';

      SuperWallet.Add(this.chainData.id, this.walletAddress);

      if (!gasPrice) {
        this.GetGasPrice();
      }
    } else {
      throw new Error('Invalid Chain/Swap');
    }
  }

  public async GetGasPrice(): Promise<string> {
    try {
      const gasPrice = await this.web3.eth.getGasPrice();

      this.gasPrice = gasPrice;

      return gasPrice;
    } catch (error) {
      Logger.log('Failed to fetch GasPrice ', error);

      return this.chainData.defaultGas;
    }
  }

  public async GetERC20Data(contractAddress: string): Promise<ERC20TokenData> {
    const token = new this.web3.eth.Contract(erc20abi, contractAddress);

    try {
      const symbol = await token.methods.symbol().call();
      const name = await token.methods.name().call();
      const totalSupply = await token.methods.totalSupply().call();
      const decimals = await token.methods.decimals().call();

      const intTotalSupply = Number(totalSupply.slice(0, Number(decimals) * -1));

      return {
        symbol,
        name,
        totalSupply,
        intTotalSupply,
        decimals: Number(decimals),
      };
    } catch (error) {
      throw new Error(`Unable to find Contract!  ${contractAddress} , ${error}`);
    }
  }

  public async BalanceOfErc20(contractAddress: string) {
    const token = new this.web3.eth.Contract(erc20abi, contractAddress);

    try {
      const balance = await token.methods.balanceOf(this.walletAddress).call();

      return balance as string;
    } catch (error) {
      Logger.log('Failed to connect ERC 20: ', contractAddress, ' ', error);
    }

    throw new Error('Unable to fetch Balance');
  }

  public async ApproveErc20(contractAddress: string, approveTo: string, amount: string | number) {
    const token = new this.web3.eth.Contract(erc20abi, contractAddress);

    return token.methods.approve(approveTo, amount).encodeABI();
  }

  public async AllowanceErc20(contractAddress: string) {
    const token = new this.web3.eth.Contract(erc20abi, contractAddress);

    try {
      const allowedAmount = await token.methods.allowance(this.walletAddress, this.chainData.router).call();

      return new BigNumber(allowedAmount).toNumber();
    } catch (error) {
      Logger.log('Failed to connect ERC 20: ', contractAddress, ' ', error);
      throw new Error('Unable to get allowance');
    }
  }

  public async GetApeSwapValue(tokenAddress: string, numToken: string) {
    const token = new this.web3.eth.Contract(uniSwap2ABI as any, this.chainData.router);

    try {
      if (Number(numToken) === 0) {
        return '0';
      }

      const exchangeRate = await token.methods.getAmountsOut(numToken, [tokenAddress, this.chainData.wCoin]).call();

      return exchangeRate[1];
    } catch (error) {
      Logger.log('Failed to fetch UniSwap Data: ', tokenAddress, ' ', error);
    }

    throw new Error('Unable to calculate value!');
  }

  /*
AKA BUY

swapExactETHForTokens
0	amountIn	uint256	9400000000000000
1	amountOutMin	uint256	0
2	path	address[]	bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c , 062d63aa148bff09615eb5e4306000a39d5eceb1
3	to	address	a6364afb914792fe81e0810d5f471be172079f7b
4	deadline	uint256	1631732366


*/
  public async SwapExactETHForTokens(tokenAddress: string, from = this.walletAddress, amountOutMin = '1') {
    const web3 = new Web3();

    const uniSwap = new web3.eth.Contract(uniSwap2ABI as any, this.chainData.router);

    const path = [this.chainData.wCoin, tokenAddress];

    try {
      // Give 24 Hour for deadline
      const deadline = Math.round(Date.now() / 1000 + 86400);

      return uniSwap.methods
        .swapExactETHForTokensSupportingFeeOnTransferTokens(amountOutMin, path, from, deadline)
        .encodeABI();
    } catch (error) {
      Logger.log('Failed create swapETHForExactTokens', tokenAddress, ' ', error);
    }
  }

  /*
AKA SELL
swapExactTokensForETHSupportingFeeOnTransferTokens

0	amountIn	uint256	2000025924498379
1	amountOutMin	uint256	291102385407806924
2	path	address[]	062d63aa148bff09615eb5e4306000a39d5eceb1, bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c
3	to	address	1e3d3eb2d899ddf90f07a6de0d655c639aa1064b
4	deadline	uint256	1632164297

*/

  public async SwapExactTokensForETH(
    tokenAddress: string,
    amountIn: string | number | any,
    from = this.walletAddress,
    amountOutMin = '1',
  ) {
    const web3 = new Web3();

    const uniSwap = new web3.eth.Contract(uniSwap2ABI as any, this.chainData.router);

    const path = [tokenAddress, this.chainData.wCoin];

    try {
      // Give 24 Hour for deadline
      const deadline = Math.round(Date.now() / 1000 + 86400);

      return uniSwap.methods
        .swapExactTokensForETHSupportingFeeOnTransferTokens(amountIn, amountOutMin, path, from, deadline)
        .encodeABI();
    } catch (error) {
      Logger.log('Failed create swapETHForExactTokens', tokenAddress, ' ', error);
    }
  }

  public async GetLiquidityAddress(tokenAddress: string): Promise<string> {
    try {
      const token = new this.web3.eth.Contract(uniFactoryABI as any, this.chainData.factory);

      const liquidityPairAddress = await token.methods.getPair(this.chainData.wCoin, tokenAddress).call();

      return liquidityPairAddress as string;
    } catch (error) {
      throw new Error(`Unable to find LiquidityPairAddress!  ${tokenAddress} , ${error}`);
    }
  }

  public async GetLiquidityAmount(liquidityPairAddress: string): Promise<BigNumber> {
    try {
      const erc20 = new this.web3.eth.Contract(erc20abi, this.chainData.wCoin);

      const liquidityCoinAmount = await erc20.methods.balanceOf(liquidityPairAddress).call();

      return new BigNumber(liquidityCoinAmount);
    } catch (error) {
      throw new Error(`Unable to find Liquidity for ${liquidityPairAddress}`);
    }
  }

  public async CreateSignedTx(data: string, txConfing: TxConfing) {
    const nonce = SuperWallet.GetNonce(this.chainData.id, this.walletAddress);

    const tx = {
      // this could be provider.addresses[0] if it exists
      from: this.walletAddress,
      // target address, this could be a smart contract address
      to: txConfing.to,
      // optional if you want to specify the gas limit
      gas: txConfing.gasLimit ?? new BigNumber(this.gasLimit).toNumber(),
      gasPrice: txConfing.gasPrice ?? new BigNumber(this.gasPrice).toNumber(),
      // optional if you are invoking say a payable function
      value: txConfing.value,
      // nonce
      nonce: nonce ?? undefined,
      // this encodes the ABI of the method and the arguements
      data: data,
    };

    Logger.log(`New TX created`, {
      walletNonce: nonce,
      txNonce: tx.nonce,
      from: tx.from,
      gas: tx.gas,
      gasPrice: tx.gasPrice,
      value: tx.value,
    });

    const singed = await this.web3.eth.accounts.signTransaction(tx, this.walletPrivateKey);

    if (singed.rawTransaction) {
      return singed.rawTransaction;
    }

    throw new Error('Unable to create rawTransaction!');
  }
  public async GetEthBalance() {
    const balance = await this.web3.eth.getBalance(this.walletAddress);

    return balance;
  }

  public async SendSignedTx(singedTx: string) {
    try {
      SuperWallet.IncNonce(this.chainData.id, this.walletAddress);

      const receipt = await new Web3Tx(this.web3).Send(singedTx);

      return receipt;
    } catch (e) {
      Logger.log(e);
    }
  }
}
