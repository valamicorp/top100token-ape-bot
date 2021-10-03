import { EventEmitter } from 'eventemitter3';
import Logger from '../../util/logger';
const rp = require('request-promise');

export class CoinMarketCap extends EventEmitter {
  private ready = true;

  private apiKey: string;

  private lastSignal = '';
  private listener?: NodeJS.Timer;

  private lastProcessed = 0;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;


    if(this.apiKey === ''){
        Logger.log('No CMC API key set, Coinmarketcap plugin disabled!');
        return;
      }

    setTimeout(() => {
        this.GetLasterCoins();
    }, 10000);

    // Every 7 Minute check
    this.listener = setInterval(async () => {
      if (this.ready) {
        this.GetLasterCoins();
      }
    }, 420 * 1000);


    Logger.log('CMC Plugin, started!');
  }

  public async GetLasterCoins(): Promise<void> {
    this.ready = false;

    try {
      const requestOptions = {
        method: 'GET',
        uri: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
        qs: {
          limit: '1',
          sort: 'date_added',
        },
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
        },
        json: true,
        gzip: true,
      };

      const response = await rp(requestOptions);

      if (response.data) {
        response.data.forEach((e) => {
          if (e.platform?.id === 1839 && e.platform?.token_address !== this.lastSignal) {
            this.lastSignal = e.platform.token_address;
            if (this.lastProcessed !== 0) {
              this.emit('newSignal', this.lastSignal);
            }
          }

          Logger.log(`CoinmarketCap latest coin: `, e);
        });

        this.lastProcessed += 1;
      }
    } catch (error) {
      Logger.log('CoinmarketCap error, ', error);
    } finally {
      this.ready = true;
    }
  }
}
