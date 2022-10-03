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
};

window.onload = (event) => {
  writeInfo({
    chainName: 'loading...',
    walletAddress: 'loading...',
    walletBalance: 'loading...',
  });

  if (store.get('privateKey')) {
    document.getElementById('setting1').value = store.get('privateKey');
  } else {
    const setupModal = new SetupModal();
    setupModal.Open();
  }

  if (store.has('chainId')) {
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
  if (store.has('maxSlippage')) {
    document.getElementById('setting7').value = store.get('maxSlippage');
  }
  if (store.has('telegramChannel')) {
    document.getElementById('settingTelegramChannel').value = store.get('telegramChannel');
  }
  if (store.has('telegramAPI')) {
    document.getElementById('settingTelegramAPI').value = store.get('telegramAPI');
  }
  if (store.has('telegramFilter')) {
    document.getElementById('settingTelegramFilter').value = store.get('telegramFilter');
  }
  if (store.has('telegramAPIHASH')) {
    document.getElementById('settingTelegramAPIHASH').value = store.get('telegramAPIHASH');
  }
  if (store.has('telegramSession')) {
    document.getElementById('settingTelegramSession').value = store.get('telegramSession');
  }

  if (store.has('customRPC')) {
    document.getElementById('customRPC').value = store.get('customRPC');
  }

  if (store.has('privateKey')) {
    ipcRenderer.send('start:sync');
  }

  ipcRenderer.on('logger:log', (event, payload) => {
    console.log('Node:', ...payload);
  });

  ipcRenderer.on('portfolio:sync', (event, payload) => {
    renderPortfolio(payload);
  });

  ipcRenderer.on('selectedToken:data:update', (event, payload) => {
    document.getElementById('token:name').innerHTML = `${payload.name} (${payload.symbol})`;
    document.getElementById('token:supply').innerHTML = payload.intTotalSupply;
    document.getElementById('token:decimal').innerHTML = payload.decimals;
    document.getElementById('token:balance').innerHTML = payload.balance;

    if (payload.isHoneypot === 0) {
      document.getElementById('token:taxes').innerHTML = `Buy: ${payload.buyTax}% / Sell: ${payload.sellTax}%`;
    }

    if (payload.isHoneypot === 1) {
      document.getElementById('token:taxes').innerHTML = `Unable to trade!`;
    }

    if (payload.isHoneypot === -1) {
      document.getElementById('token:taxes').innerHTML = `Unable to calculate tax!`;
    }
  });

  ipcRenderer.on('write:info', (event, payload) => {
    if (payload.status === 'success') {
      writeInfo({
        chainName: payload.chainName,
        walletAddress: payload.walletAddress,
        walletBalance: payload.walletBalance,
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

  document.getElementById('apeAddress').addEventListener('input', function () {
    const apeAddress = document.getElementById('apeAddress').value.trim();

    if (apeAddress.length !== 42) {
      return;
    }

    ipcRenderer.send('apeAddress:changed', apeAddress);
  });

  document.getElementById('startButton').addEventListener('click', function () {
    const apeAddress = document.getElementById('apeAddress').value.trim();

    if (apeAddress.length !== 42) {
      return;
    }

    ipcRenderer.send('button:control', 'start', apeAddress);

    clearTradeStatus();
  });

  document.getElementById('loadKeyPrivateKey').addEventListener('click', () => {
    if (store.has('privateKey')) {
      document.getElementById('privateKeyReadable').value = store.get('privateKey');
    }
  });
};

const writeInfo = ({ chainName, walletAddress, walletBalance }) => {
  if (chainName !== window.StateApeUI.chainName) {
    document.getElementById('chainName').innerHTML = chainName;
  }
  if (walletAddress !== window.StateApeUI.walletAddress) {
    document.getElementById('walletAddress').innerHTML = walletAddress;
  }
  if (walletBalance !== window.StateApeUI.walletBalance) {
    document.getElementById('walletBalance').innerHTML = walletBalance;
  }

  window.StateApeUI = {
    ...window.StateApeUI,
    chainName,
    walletAddress,
    walletBalance,
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
  const maxSlippage = document.getElementById('setting7').value;

  if (privateKey && typeof privateKey === 'string' && privateKey.length >= 64) {
    store.set('privateKey', privateKey);
  }

  const telegramSession = document.getElementById('settingTelegramSession').value;
  const telegramChannel = document.getElementById('settingTelegramChannel').value;
  const telegramAPI = document.getElementById('settingTelegramAPI').value;
  const telegramAPIHASH = document.getElementById('settingTelegramAPIHASH').value;
  const telegramFilter = document.getElementById('settingTelegramFilter').value;

  const customRPC = document.getElementById('customRPC').value;

  store.set('customRPC', customRPC.trim());

  // Setup Telegram Plugin
  store.set('telegramChannel', telegramChannel.trim());

  if (telegramSession.length > 2 && telegramAPI.length > 2 && telegramAPIHASH.length > 2) {
    store.set('telegramAPI', telegramAPI.trim());
    store.set('telegramAPIHASH', telegramAPIHASH.trim());
    store.set('telegramSession', telegramSession.trim());
    store.set('telegramFilter', telegramFilter.trim());
  }

  store.set('chainId', chain);
  store.set('apeAmount', apeAmount);
  store.set('minProfit', minProfit);
  store.set('gasPrice', gasPrice);
  store.set('gasLimit', gasLimit);
  store.set('maxSlippage', maxSlippage);

  return {
    privateKey,
    chain,
    apeAmount,
    minProfit,
    gasPrice,
    gasLimit,
    maxSlippage,
  };
};

const clearTradeStatus = () => {
  document.getElementById('traderStatus2').innerHTML = '';
  document.getElementById('traderStatus').innerHTML = '';
};
