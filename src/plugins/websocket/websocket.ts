/*
const response = {
  channelName: '',
  content: ''
  network: 'ethereum',
  contract: '',
  channelData: {
    channelName: '',
    logo: '',
    telegramCount: 8,
    channelId: 1625473680,
    hiddenChannelId: null,
    lastMessage: 0,
    signalQuality: 80,
    updateAt: '2022-10-07T19:27:03.000Z',
    type: 'Telegram',
    totalSignalCount: 35,
    weeklySignalCount: 2,
    weeklySignalGainAvg: 0.2094730881828777,
    monthlySignalCount: 6,
    monthlySignalGainAvg: 0.26608662003616934,
    lastSignal: '2022-10-07T19:27:00.000Z',
  },
};
*/

import EventEmitter from 'eventemitter3';
import WebSocket from 'ws';

export class WebsocketSignaler extends EventEmitter {
  private channelNames: string[];
  private network?: string;
  private wsAddress: string;
  private client!: WebSocket;

  constructor(wsAddress: string, channelNames: string, network: string) {
    super();
    this.wsAddress = wsAddress;
    this.network = network;
    this.channelNames = channelNames.split(',');

    this.initHandlers();

    setInterval(() => {
      try {
        if (this.client) {
          this.client.ping();
        }
      } catch (error) {
        console.log('Unable to ping');
      }
    }, 5000);

    setInterval(() => {
      try {
        if (!this.client.OPEN) {
          this.reConnection();
        }
      } catch (error) {
        console.log('Unable to ReConnect');
      }
    }, 60 * 1000);
  }

  initHandlers() {
    this.client = new WebSocket(this.wsAddress);

    this.client.on('open', () => {
      console.log('Websocket connected');
    });

    this.client.on('pong', (data) => {
      if (Math.random() > 0.95) {
        console.log(`pong recreived`, new Date());
      }
    });

    this.client.on('message', (data) => {
      console.log(`message recreived`, data.toString());

      try {
        const signalData = {
          ...JSON.parse(data.toString()),
        };

        if (signalData.network === 'binance') {
          this.emit('newSignal', signalData.contract);
        }
      } catch (error) {
        console.log('Failed to process signal');
      }
    });

    this.client.on('close', async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      this.client.terminate();

      this.reConnection();
    });
  }

  reConnection() {
    this.client = new WebSocket(this.wsAddress);
  }
}
