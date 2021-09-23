import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { uniSwap2ABI } from '../abi/uniSwap2';


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
        console.log('Failed to fetch UniSwap Data: ',tokenAddress ," ", error);
    }

    throw new Error('Unable to find exchangeRate!');
  
};

export const getApeSwapValue = async (rcpAddress: string, routerAddress: string,  wCoin: string, tokenAddress: string, numToken: string): Promise<string> => {


    const provider = new Web3.providers.HttpProvider(rcpAddress);
    const web3 = new Web3(provider);

    const token = new web3.eth.Contract(uniSwap2ABI as any, routerAddress);
 
    try {
      
        // getAmountsOut(1.0, [token, WETH])
        const exchangeRate = await token.methods.getAmountsOut(numToken,[tokenAddress,wCoin]).call();
        // getAmountsOut(1.0, [WETH, token])
        
        return exchangeRate[1];


    } catch (error) {
        console.log('Failed to fetch UniSwap Data: ',tokenAddress ," ", error);
    }

    throw new Error('Unable to find exchangeRate!');
  
};


/*
AKA BUY

swapExactETHForTokens
0	amountIn	uint256	9400000000000000
1	amountOutMin	uint256	0
2	path	address[]	bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c , 062d63aa148bff09615eb5e4306000a39d5eceb1
3	to	address	a6364afb914792fe81e0810d5f471be172079f7b
4	deadline	uint256	1631732366


*/


export const swapExactETHForTokens = (routerAddress: string, wCoin: string, tokenAddress: string, from: string, amountOutMin = '1') => {

    const web3 = new Web3();

    const uniSwap = new web3.eth.Contract(uniSwap2ABI as any, routerAddress);

    const path = [wCoin,tokenAddress];
 
    try {
        // Give 24 Hour for deadline
        const deadline = Math.round((Date.now() / 1000) + 86400);

        return uniSwap.methods.swapExactETHForTokens(amountOutMin,path,from,deadline).encodeABI() 


    } catch (error) {
        console.log('Failed create swapETHForExactTokens',tokenAddress ," ", error);
    }
  
};

/*
AKA SELL
swapExactTokensForETHSupportingFeeOnTransferTokens

0	amountIn	uint256	2000025924498379
1	amountOutMin	uint256	291102385407806924
2	path	address[]	062d63aa148bff09615eb5e4306000a39d5eceb1, bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c
3	to	address	1e3d3eb2d899ddf90f07a6de0d655c639aa1064b
4	deadline	uint256	1632164297

*/

export const swapExactTokensForETH = (routerAddress: string, wCoin: string, tokenAddress: string, from: string, amountIn: string | number | any, amountOutMin = '1') => {

    const web3 = new Web3();

    const uniSwap = new web3.eth.Contract(uniSwap2ABI as any, routerAddress);

    const path = [tokenAddress, wCoin];
 
    try {
        // Give 24 Hour for deadline
        const deadline = Math.round((Date.now() / 1000) + 86400);


        return uniSwap.methods.swapExactTokensForETHSupportingFeeOnTransferTokens(amountIn,amountOutMin,path,from,deadline).encodeABI() 


    } catch (error) {
        console.log('Failed create swapETHForExactTokens',tokenAddress ," ", error);
    }
  
};