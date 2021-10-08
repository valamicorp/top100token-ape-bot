
class StateManagerClass {
  instance: any = null;
  data: any = {}; // store data in here
  private window?: Electron.BrowserWindow;

  constructor() {
    if (!this.instance) {
      this.instance = this;
    }

    return this.instance;
  }

}

const StateManager: StateManagerClass = new StateManagerClass();

export default StateManager;
