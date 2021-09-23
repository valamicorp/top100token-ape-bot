import Web3 from 'web3';

const erc20abi = require('erc-20-abi');

export interface ERC20TokenData {
    symbol: string;
    name: string;
    totalSupply: string;
    intTotalSupply: number;
    decimals: number;
}


// Get ERC20 Basic Data

export const getERC20Data = async (rcpAddress: string, contractAddress: string): Promise<ERC20TokenData> => {


    const provider = new Web3.providers.HttpProvider(rcpAddress);
    const web3 = new Web3(provider);

    const token = new web3.eth.Contract(erc20abi, contractAddress);
 
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
            decimals: Number(decimals)
        };

    } catch (error) {
        console.log('Failed to fetch ERC 20: ',contractAddress ," ", error);
    }
  
    throw new Error('Unable to find Contract!');
};


export const balanceOfErc20 = async (rcpAddress: string, contractAddress: string, wallet: string): Promise<string> => {
    const provider = new Web3.providers.HttpProvider(rcpAddress);
    const web3 = new Web3(provider);

    const token = new web3.eth.Contract(erc20abi, contractAddress);
 
    try {
        const balance = await token.methods.balanceOf(wallet).call();

        return balance as string;
    } catch (error) {
        console.log('Failed to connect ERC 20: ',contractAddress ," ", error);
    }
 
    throw new Error('Unable to fetch Balance');
}

export const ApproveErc20 = (contractAddress: string, approveTo: string, amount: string | number) => {
    const web3 = new Web3();
    
    const token = new web3.eth.Contract(erc20abi, contractAddress);

    return token.methods.approve(approveTo, amount).encodeABI() 
 
}