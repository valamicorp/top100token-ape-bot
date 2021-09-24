import Web3 from "web3";

const crypto = require("crypto");
export const randomEntropy = crypto.randomBytes(32).toString('hex');

export interface TxConfing {
    to: string;
    value?: number | string ;
    gasLimit?: number | string;
    gasPrice?: number | string;
}

export const AddressFromPrivatekey = (privateKey: string) => {
    const web3 = new Web3();

    const wallet = web3.eth.accounts.privateKeyToAccount(privateKey);

    return wallet.address;
} 


export const createWeb3Wallet = async (rcpAddress: string, entropy = randomEntropy): Promise<any> => {
    const provider = new Web3.providers.HttpProvider(rcpAddress);
    const web3 = new Web3(provider);

   const result = web3.eth.accounts.create(entropy);

   console.log(result);

   return result;
};

export const getEthBalance = async (rcpAddress: string, address: string): Promise<string>  =>{
    const provider = new Web3.providers.HttpProvider(rcpAddress);
    const web3 = new Web3(provider);

    const balance = await web3.eth.getBalance(address);

   // console.log('Wallet : ', address, 'balance: ', web3.utils.fromWei(balance));

    return balance;
}




