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




