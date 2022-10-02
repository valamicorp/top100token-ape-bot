import { BigNumber } from 'bignumber.js';
import Web3 from 'web3';

export const databaseName = 'top100storage.db';

export const approveInfinity = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

export const approveSafeInfinity = '2157920892373161954235709850086879078532699846656405';

export const DustLimit = new BigNumber(Web3.utils.toWei('0.015', 'ether'));
