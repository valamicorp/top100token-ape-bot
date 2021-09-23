import Web3 from "web3";

const crypto = require("crypto");
export const randomEntropy = crypto.randomBytes(32).toString('hex');

export interface TxConfing {
    from: string | number;
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

export const loadWeb3Wallet = async (rcpAddress: string,privateKey: string): Promise<Web3> => {
    const provider = new Web3.providers.HttpProvider(rcpAddress);
    const web3 = new Web3(provider);

    
   const wallet = await web3.eth.accounts.privateKeyToAccount(privateKey);

   await getEthBalance(rcpAddress, wallet.address)

   return web3;
};


export const createSignedTx = async (rcpAddress: string, privateKey: string, data: string, txConfing: TxConfing): Promise<string> => {
    const provider = new Web3.providers.HttpProvider(rcpAddress);
    const web3 = new Web3(provider);

    
    const tx = {
        // this could be provider.addresses[0] if it exists
        from: txConfing.from, 
        // target address, this could be a smart contract address
        to: txConfing.to, 
        // optional if you want to specify the gas limit 
        gas: txConfing.gasLimit ?? 1600000, 
        gasPrice: txConfing.gasPrice ?? 5000000000, // 5 gwei default
        // optional if you are invoking say a payable function 
        value: txConfing.value,
        // this encodes the ABI of the method and the arguements
        data: data
      };

    const singed =  await  web3.eth.accounts.signTransaction(tx, privateKey); 

    if(singed.rawTransaction){
        return singed.rawTransaction;
    }
    
    throw new Error('Unable to create rawTransaction!');
};


export const sendSignedTx = async (rcpAddress: string, privateKey:string, singedTx: string): Promise<any> => {
    
    const web3 =  await loadWeb3Wallet(rcpAddress, privateKey);

    try{
      const receipt = await web3.eth.sendSignedTransaction(singedTx);

      return receipt;
    }catch(e) {
        console.log(e)
    }

};