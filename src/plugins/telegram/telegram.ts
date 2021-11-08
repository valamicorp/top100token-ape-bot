import { EventEmitter } from 'eventemitter3';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import Logger from '../../util/logger';

export const getCurrentTimeUTC = () => {

  const tmLoc = new Date();

  return Math.floor((tmLoc.getTime()) / 1000);
}


export class TelegramScrapper extends EventEmitter {
  private ready = true;

  private apiId: number;
  private apiHash: string;
  private stringSession: StringSession;
  private channelName: string;

  private lastSignal = '';
  private listener?: NodeJS.Timer;
  private client?: TelegramClient;

  private customFilter?: string;

  private lastProcessed = 0;

  constructor(apiId: string, apiHash: string, session: string, channelName: string, customFilter?: string) {
    super();
    this.apiId = Number(apiId);
    this.apiHash = apiHash;
    this.stringSession = new StringSession(session);
    this.channelName = channelName;

    if (this.channelName === '') {
      Logger.log('No telegram channel set, telegram plugin disabled!');
      return;
    }

    this.client = new TelegramClient(this.stringSession, this.apiId, this.apiHash, {
      connectionRetries: 5,
    });

    // Every 2 Minute check
    this.listener = setInterval(async () => {
      if (this.ready) {
        await this.GetPoocoinSignal();
      }
    }, 3500);
  }

  public async GetPoocoinSignal(): Promise<void> {
    this.ready = false;

    try {
      if (!this.client) {
        return;
      }

      if (!this.client.connected) {
        await this.client.connect();
      }

      const channelResult = await this.client.invoke(
        new Api.channels.GetFullChannel({
          channel: this.channelName,
        }),
      );

      const lastMessage = (channelResult.fullChat as any).readInboxMaxId;

      if (!this.lastProcessed) {
        this.lastProcessed = lastMessage;
      }

      // const unreadCount = (channelResult.fullChat as any).unreadCount;

      Logger.log('Telegram', `Last: ${lastMessage} , Last processed: ${this.lastProcessed}`);

      if(lastMessage && lastMessage > this.lastProcessed + 2){
        this.lastProcessed = lastMessage;
      }

      let message = ''

      while (message !== undefined) {

        const getLastMessage = await this.client.invoke(
          new Api.channels.GetMessages({
            channel: this.channelName,
            id: [this.lastProcessed+1] as any,
          }),
        );

        const content = (getLastMessage as any)?.messages[0]?.message;

        message = content;

        if (content) {
          Logger.log('Telegram signal', content, new Date());
          this.lastProcessed += 1;
        } else {
          break;
        }

        // Drop signals older than 15 minutes
        if(getCurrentTimeUTC()  > (getLastMessage as any)?.messages[0].date + 30){
          Logger.log('Telegram signal too old', getCurrentTimeUTC(), (getLastMessage as any)?.messages[0].date);
          break;
        }

        // Custom Signal Filter
        if(this.customFilter && this.customFilter.length > 0) {
              if (content.includes(this.customFilter)) {

                Logger.log('Telegram address found!', content, new Date());

                const regex = /0x[a-fA-F0-9]{40}/;
                const almostAddress = content.match(regex);

                if (almostAddress[0] && this.lastSignal !== almostAddress[0]) {
                  this.lastSignal = almostAddress[0];
                  this.emit('newSignal', almostAddress[0]);
                  return;
                }
              }

            return;
        }

        // CMC list signals
        if ( content.includes('first pump') && content.includes('BNB')) {

          Logger.log('Telegram address found!', content, new Date());

          const regex = /0x[a-fA-F0-9]{40}/;
          const almostAddress = content.match(regex);

          if (almostAddress[0] && this.lastSignal !== almostAddress[0]) {
            this.lastSignal = almostAddress[0];
            this.emit('newSignal', almostAddress[0]);
            return;
          }
        }


        // Poocoin signals
        if (content.includes('poocoin.app')) {

          Logger.log('Telegram address found!', content, new Date());

          const almostAddres = content.split('poocoin.app/tokens/');

          // for e.g. 0xb6a6dcccba92905c34801e1458b0606e07bb3dd4
          const address = almostAddres[1].substring(0, 42);

          if (this.lastSignal !== address) {
            this.lastSignal = address;
            this.emit('newSignal', address);
            return;
          }
        }


      }
    } catch (error) {
      Logger.log('Telegram error, ', error);
    } finally {
      this.ready = true;
    }
  }
}
