import BigNumber from "bignumber.js";
import { DustLimit } from "../contants";
import { Balance,  TokenContract, TradeEvent} from "../types";
import Logger from "../util/logger";

export const Iftt = async (chain: string, contract: TokenContract, balance: Balance): Promise<TradeEvent | undefined> => {
        // TODO: Plugin support
        if(contract.overwritePlugin){
            return;
        }

        // Buy if possible
        if(contract.buyPrice && contract.tokenPrice){
            const buyPrice = new BigNumber(contract.buyPrice);
            const tokenPrice = new BigNumber(contract.tokenPrice);


            if(tokenPrice.isLessThanOrEqualTo(buyPrice)){
                const curPosition = new BigNumber(contract.position.amountCoin);
                const apeAmount = new BigNumber(contract.apeAmount);

                const balanceOfCoin = new BigNumber(balance.ethBalance);

                const buyAmount = apeAmount.minus(curPosition);


                Logger.log('IFTT buy position check: ', curPosition.toString(), apeAmount.toString());

                if(curPosition.isLessThan(apeAmount) && balanceOfCoin.isGreaterThan(buyAmount.plus(DustLimit)))
                {
                    return {
                        type: 'buy',
                        chain,
                        address: contract.address,
                        amountCoin: buyAmount.toString()
                    }
                }
            }
        }

        // Sell if possible
        if(contract.sellPrice && contract.tokenPrice){
            const sellPrice = new BigNumber(contract.sellPrice);
            const tokenPrice = new BigNumber(contract.tokenPrice);

            if(tokenPrice.isGreaterThanOrEqualTo(sellPrice)){
                if(balance[contract.address])
                {
                    const sellAmount = new BigNumber(balance[contract.address]);

                    if(sellAmount.isZero()){
                        return;
                    }

                    return {
                        type: 'sell',
                        chain,
                        address: contract.address,
                        amountToken: sellAmount.toString()
                    }
                }
            }
        }

        return;
} 



