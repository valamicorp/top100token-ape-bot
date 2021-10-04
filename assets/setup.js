class SetupModal {
  constructor() {
    this.modalObject = new bootstrap.Modal(document.getElementById('setupModal'), {
      keyboard: false,
      backdrop: 'static'
    });

    this.privateKeyField = document.getElementById('setupWalletPrivateKey');

    ipcRenderer.on('wallet:generate', (event, payload) => {
      if (payload.privateKey) {
        this.privateKeyField.value = payload.privateKey;
      }
    });

    document.getElementById('setupSaveAndClose').addEventListener('click', () => {
      ipcRenderer.send('wallet:save', this.privateKeyField.value);

      document.getElementById('setting1').value = this.privateKeyField.value;

      ipcRenderer.send('start:sync');
      syncSetting();
    });

    document.getElementById('generatePrivateKey').addEventListener('click', () => {
      this.GeneratePrivateKey();
    });
  }

  Open() {
    this.modalObject.show();

    this.privateKeyField.value = '';
  }

  GeneratePrivateKey() {
    ipcRenderer.send('wallet:generate', '');
  }
}

