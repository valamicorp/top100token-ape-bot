import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { uniSwap2ABI } from '../../abi/uniSwap2';
import Logger from '../../util/logger';


export interface SwapTokenData {
    tokenPricePerCoin: any;
   // maxSellLiquidity: string;
   // maxBuyLiquidity: string;
}


// Get ERC20 Basic Data

export const getUniSwapData = async (rcpAddress: string, routerAddress: string,  wCoin: string, tokenAddress: string, decimal: number): Promise<SwapTokenData> => {


    const provider = new Web3.providers.HttpProvider(rcpAddress);
    const web3 = new Web3(provider);

    const token = new web3.eth.Contract(uniSwap2ABI as any, routerAddress);
 
    try {
      
        // getAmountsOut(1.0, [token, WETH])
        const exchangeRate = await token.methods.getAmountsOut(new BigNumber(1).multipliedBy(10 ** decimal).toString(),[tokenAddress,wCoin]).call();
        // getAmountsOut(1.0, [WETH, token])
        
        const tokenPricePerCoin = new BigNumber((exchangeRate[1])).dividedBy(10 ** 18).toString();


        
        return {
          tokenPricePerCoin,
           };


    } catch (error) {
        Logger.log('Failed to fetch UniSwap Data: ',tokenAddress ," ", error);
    }

    throw new Error('Unable to find exchangeRate!');
  
};




