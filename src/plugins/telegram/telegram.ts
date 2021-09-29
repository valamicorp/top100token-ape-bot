    import { EventEmitter } from 'eventemitter3';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import Logger from '../../util/logger';

export class TelegramScrapper extends EventEmitter {
  private ready = true;

  private apiId: number;
  private apiHash: string;
  private stringSession: StringSession;
  private channelName: string;

  private lastSignal = '';
  private listener?: NodeJS.Timer;
  private client?: TelegramClient;

  private lastProcessed = 0;

  constructor(apiId: string, apiHash: string, session: string, channelName: string) {
    super();
    this.apiId = Number(apiId);
    this.apiHash = apiHash;
    this.stringSession = new StringSession(session);
    this.channelName = channelName;

    if(this.channelName === ''){
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
    }, 5000);
  }

  public async GetPoocoinSignal(): Promise<void> {
    this.ready = false;

    try {
      if(!this.client){
        return;
      }

      if(!this.client.connected){
        await this.client.connect();
      }
      
      const channelResult = await this.client.invoke(
        new Api.channels.GetFullChannel({
          channel: this.channelName,
        }),
      );

      const lastMessage = (channelResult.fullChat as any).readInboxMaxId;

      if(!this.lastProcessed){
        this.lastProcessed = lastMessage;
      }

     // const unreadCount = (channelResult.fullChat as any).unreadCount;

      Logger.log('Telegram', `Last: ${lastMessage} , Last processed: ${this.lastProcessed}`);

      let message = ''

      while(message !== undefined){

        const getLastMessage = await this.client.invoke(
          new Api.channels.GetMessages({
            channel: this.channelName,
            id: [this.lastProcessed+1] as any,
          }),
        );

        const content = (getLastMessage as any)?.messages[0]?.message;

        message = content;

        if(content){
          Logger.log('Telegram signal', content, new Date());
          this.lastProcessed+=1; 
        }else{
          break;
        }

        if (content && content.includes('poocoin.app')) {

          Logger.log('Telegram address found!', content, new Date());
  
          const almostAddres = content.split('poocoin.app/tokens/');
  
          // for e.g. 0xb6a6dcccba92905c34801e1458b0606e07bb3dd4
          const address = almostAddres[1].substring(0, 42);
  
          if (this.lastSignal !== address) {
            this.lastSignal = address;
            this.emit('newSignal', address);
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
