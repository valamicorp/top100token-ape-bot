import Web3 from "web3";

export interface Account {
    address: string;
    privateKey: string;
    signTransaction: any;
    sign: any;
    encrypt: any;
}

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


export const createWeb3Wallet = (entropy = randomEntropy): Account => {
   const web3 = new Web3();

   const result = web3.eth.accounts.create(entropy);

   return result;
};

export const getEthBalance = async (rcpAddress: string, address: string): Promise<string>  =>{
    try {
        const provider = new Web3.providers.HttpProvider(rcpAddress);
        const web3 = new Web3(provider);
    
        const balance = await web3.eth.getBalance(address);
 
        return balance;
    } catch (error) {
        return "0";
    }

}




