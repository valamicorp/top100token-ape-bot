import { BigNumber } from "bignumber.js";
import { Position, Transaction } from "../types";
import Logger from "../util/logger";

export const calculatePosition = (transactions: Transaction[], approveCb?: any): Position => {

    let amountCoin = new BigNumber(0); 
    let amountToken = new BigNumber(0); 

    transactions.forEach(e => {
        
        if(e.side === 'buy'){
            const buyValue = new BigNumber(e.amountCoin);
            const buyToken = new BigNumber(e.amountToken);
            amountCoin = amountCoin.plus(buyValue);
            amountToken = amountToken.plus(buyToken);
        }

        if(e.side === 'sync'){
            const syncValue = new BigNumber(e.amountCoin);
            const syncToken = new BigNumber(e.amountToken);
            amountCoin = amountCoin.plus(syncValue);
            amountToken = amountToken.plus(syncToken);
        }

        if(e.side === 'sell'){
            const sellValue = new BigNumber(e.amountCoin);
            const sellToken = new BigNumber(e.amountToken);
            amountCoin = amountCoin.minus(sellValue);
            amountToken = amountToken.minus(sellToken);
        }

        if(e.side === 'approve' && approveCb){
            approveCb();
        }

    });


    Logger.log({
        amountCoin: amountCoin.toString(),
        amountToken: amountToken.toString(),
    })

    return {
        amountCoin,
        amountToken
    }
}