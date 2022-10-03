import { EventEmitter } from 'eventemitter3';
import { TelegramClient } from 'telegram/client/TelegramClient';
import { Api } from 'telegram';
import { StringSession } from 'telegram/sessions/StringSession';
import Logger from '../../util/logger';

export class TelegramSingaler extends EventEmitter {
  private ready = true;

  private apiId: number;
  private apiHash: string;
  private stringSession: StringSession;
  private channelNames: string[];

  private client!: TelegramClient;

  private Cache: Map<number, string> = new Map();

  private customFilter?: string;

  constructor(apiId: string, apiHash: string, session: string, channelNames: string, customFilter?: string) {
    super();
    this.apiId = Number(apiId);
    this.apiHash = apiHash;
    this.stringSession = new StringSession(session);
    this.channelNames = channelNames.split(',');

    if (this.channelNames.length === 0) {
      Logger.log('No telegram channel set, telegram plugin disabled!');
      return;
    }

    this.client = new TelegramClient(this.stringSession, this.apiId, this.apiHash, {
      connectionRetries: 5,
    });

    this.client.connect().catch();

    setTimeout(() => {
      this.SetListeners();
    }, 5000);
  }

  async SetListeners() {
    for (const channelName of this.channelNames) {
      const channelResult = await this.client.invoke(
        new Api.channels.GetFullChannel({
          channel: channelName,
        }),
      );

      this.Cache.set(channelResult.fullChat.id, channelName);
    }

    console.log(this.Cache);

    this.client.addEventHandler(async (update: any) => {
      try {
        if (update && update?.message && update?.message?.message) {
          const channelId = update?.message?.peerId?.channelId;

          if (channelId) {
            const channelName = this.Cache.get(Number(channelId));

            if (channelName) {
              const content = update?.message?.message;

              console.log('ChannelID', Number(channelId), new Date().toTimeString(), content);

              const contract = this.MessageProcess(content);

              console.log('Contract found!', contract);

              if (contract) {
                this.emit('newSignal', contract);
              }
            }
          }
        }
      } catch (error) {
        console.log('Update process error', error);
      }
    });
  }

  private MessageProcess(content: string): string | null {
    if (this.customFilter && this.customFilter.length > 0) {
      if (!content.includes(this.customFilter)) {
        return null;
      }
    }

    // Poocoin signals
    if (content.includes('poocoin.app')) {
      const almostAddress = content.split('poocoin.app/tokens/');

      // for e.g. 0xb6a6dcccba92905c34801e1458b0606e07bb3dd4
      const address = almostAddress[1].substring(0, 42);

      return address;
    }

    if (content.length > 42) {
      const regex = /0x[a-fA-F0-9]{40}/;
      const almostAddress = content.match(regex);

      if (almostAddress && almostAddress[0]) {
        return almostAddress[0];
      }
    }

    if (content.length > 42) {
      const regex = /0X[a-fA-F0-9]{40}/;
      const almostAddress = content.match(regex);

      if (almostAddress && almostAddress[0]) {
        return almostAddress[0];
      }
    }

    return null;
  }
}
