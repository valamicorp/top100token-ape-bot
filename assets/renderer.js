var settingLocked = false;

const Store = require('electron-store');
const { ipcRenderer } = require('electron');

const store = new Store({
  encryptionKey: 'The old apple revels in its authority',
});

window.StateApeUI = {
  privateKey: '',
  chainName: '',
  walletAddress: '',
  walletBalance: '',
  currentProfit: '',
};

window.onload = (event) => {
  writeInfo({
    chainName: 'loading...',
    walletAddress: 'loading...',
    walletBalance: 'loading...',
    currentProfit: '0.00%',
  });

  if (store.get('privateKey')) {
    document.getElementById('setting1').value = store.get('privateKey');
  } else {
    const setupModal = new SetupModal();
    setupModal.Open();
  }

  if (store.get('chainId')) {
    document.getElementById('setting2').value = store.get('chainId');
  }
  if (store.has('apeAmount')) {
    document.getElementById('setting3').value = store.get('apeAmount');
  }
  if (store.has('minProfit')) {
    document.getElementById('setting4').value = store.get('minProfit');
  }
  if (store.has('gasPrice')) {
    document.getElementById('setting5').value = store.get('gasPrice');
  }
  if (store.has('gasLimit')) {
    document.getElementById('setting6').value = store.get('gasLimit');
  }

  if(store.has('privateKey')){
    ipcRenderer.send('start:sync');
  }

  ipcRenderer.on('logger:log', (event, payload) => {
    console.log("Node:", ...payload);
 });

  ipcRenderer.on('portfolio:sync', (event, payload) => {
      renderPortfolio(payload);
  });
  
  ipcRenderer.on('write:info', (event, payload) => {
    if (payload.status === 'success') {
      writeInfo({
        chainName: payload.chainName,
        walletAddress: payload.walletAddress,
        walletBalance: payload.walletBalance,
        currentProfit: payload.currentProfit,
      });
    }

    if (payload.traderStatus) {
      document.getElementById('traderStatus2').innerHTML = payload.traderStatus;
    }

    if (payload.status === 'error') {
      document.getElementById('traderStatus').innerHTML = payload.statusdDetails;
    }
  });

  document.getElementById('settingSaveAndClose').addEventListener('click', () => {
    syncSetting();
  });

  document.getElementById('apeAddress').addEventListener('input', () => {
    const apeAddress = document.getElementById('apeAddress').value;
    ipcRenderer.send('apeAddress:change', apeAddress);
  });

  document.getElementById('startButton').addEventListener('click', function () {
    ipcRenderer.send('button:control', 'start');
    settingLocked = true;
    document.getElementById('settingsButton').disabled = true;
    document.getElementById('startButton').disabled = true;
    document.getElementById('pauseButton').disabled = false;
    document.getElementById('stopButton').disabled = false;
    document.getElementById('movePortfolio').disabled = false;
    document.getElementById('panicSell').disabled = false;
  });

  document.getElementById('pauseButton').addEventListener('click', function () {
    ipcRenderer.send('button:control', 'pause');
    document.getElementById('pauseButton').innerHTML =
      document.getElementById('pauseButton').innerHTML === 'Pause' ? 'Continue' : 'Pause';
    settingLocked = true;
  });

  document.getElementById('stopButton').addEventListener('click', function () {
    ipcRenderer.send('button:control', 'stop');
    settingLocked = false;
    document.getElementById('pauseButton').innerHTML = 'Pause';
    document.getElementById('startButton').disabled = false;
    document.getElementById('pauseButton').disabled = true;
    document.getElementById('stopButton').disabled = true;
    document.getElementById('panicSell').disabled = true;
    document.getElementById('movePortfolio').disabled = true;
    document.getElementById('settingsButton').disabled = false;
    clearTradeStatus();
  });

  document.getElementById('panicSell').addEventListener('click', function () {
    ipcRenderer.send('button:control', 'panicSell');
    settingLocked = true;
  });

  document.getElementById('movePortfolio').addEventListener('click', function () {
    ipcRenderer.send('button:control', 'portfolio:move');
    settingLocked = false;
    document.getElementById('pauseButton').innerHTML = 'Pause';
    document.getElementById('startButton').disabled = false;
    document.getElementById('pauseButton').disabled = true;
    document.getElementById('stopButton').disabled = true;
    document.getElementById('panicSell').disabled = true;
    document.getElementById('settingsButton').disabled = false;
    document.getElementById('apeAddress').value = '';
    document.getElementById('movePortfolio').disabled = true;
    clearTradeStatus();
  });

};




const writeInfo = ({ chainName, walletAddress, walletBalance, currentProfit }) => {
  if (chainName !== window.StateApeUI.chainName) {
    document.getElementById('chainName').innerHTML = chainName;
  }
  if (walletAddress !== window.StateApeUI.walletAddress) {
    document.getElementById('walletAddress').innerHTML = walletAddress;
  }
  if (walletBalance !== window.StateApeUI.walletBalance) {
    document.getElementById('walletBalance').innerHTML = walletBalance;
  }
  document.getElementById('currentProfit').innerHTML = currentProfit;

  window.StateApeUI = {
    ...window.StateApeUI,
    chainName,
    walletAddress,
    walletBalance,
    currentProfit,
  };
};

const syncSetting = () => {
  ipcRenderer.send('setting:async', readSetting());
};

const readSetting = () => {
  const privateKey = document.getElementById('setting1').value;
  const chain = document.getElementById('setting2').value;
  const apeAmount = document.getElementById('setting3').value;
  const minProfit = document.getElementById('setting4').value;
  const gasPrice = document.getElementById('setting5').value;
  const gasLimit = document.getElementById('setting6').value;

  if (privateKey && typeof privateKey === 'string' && privateKey.length >= 64) {
    store.set('privateKey', privateKey);
  }

  const telegramSession = document.getElementById('settingTelegramSession').value;
  const telegramChannel = document.getElementById('settingTelegramChannel').value;
  const telegramAPI = document.getElementById('settingTelegramAPI').value;
  const telegramAPIHASH = document.getElementById('settingTelegramAPIHASH').value;

  // Setup Telegram Plugin
  if(telegramChannel.length > 2){
    store.set('telegramChannel', telegramChannel.trim());
  }
  if(telegramSession.length > 2 && telegramAPI.length > 2 && telegramAPIHASH.length > 2){
    store.set('telegramAPI', telegramAPI.trim());
    store.set('telegramAPIHASH', telegramAPIHASH.trim());
    store.set('telegramSession', telegramSession.trim());
  }


  store.set('chainId', chain);
  store.set('apeAmount', apeAmount);
  store.set('minProfit', minProfit);
  store.set('gasPrice', gasPrice);
  store.set('gasLimit', gasLimit);

  return {
    privateKey,
    chain,
    apeAmount,
    minProfit,
    gasPrice,
    gasLimit,
  };
};



const clearTradeStatus = () => {
  document.getElementById('traderStatus2').innerHTML = '';
  document.getElementById('traderStatus').innerHTML = '';
}