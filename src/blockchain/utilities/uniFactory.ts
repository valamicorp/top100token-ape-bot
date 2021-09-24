import Web3 from 'web3';

const erc20abi = require('erc-20-abi');

import { uniFactoryABI } from '../../abi/uniswapFactory';


export interface SwapLiquidityData {
    liquidityCoinAmount: any;

}

export const getUniFactory = async (rcpAddress: string, factoryAddress: string,  wCoin: string, tokenAddress: string): Promise<SwapLiquidityData | undefined> => {

    const provider = new Web3.providers.HttpProvider(rcpAddress);
    const web3 = new Web3(provider);

    const token = new web3.eth.Contract(uniFactoryABI as any, factoryAddress);
 
    try {
        
        const liquidityPairAddress = await token.methods.getPair(wCoin,tokenAddress).call();
 
        const erc20 = new web3.eth.Contract(erc20abi, wCoin);

        const liquidityCoinAmount =  await erc20.methods.balanceOf(liquidityPairAddress).call();


      return {
        liquidityCoinAmount,
        };

    } catch (error) {
        console.log('Failed to fetch UniSwap Data: ',tokenAddress ," ", error);
    }
  
    throw new Error('Unable to fetch UniFactory');
};
