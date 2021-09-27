

class LoggerClass {

    instance: any = null;
    data: any = {} // store data in here
  
    constructor() {
      if (!this.instance) {
        this.instance = this;
      }
      return this.instance
    }


    public log (msg: string) {



    }

  }
  
  const Logger: LoggerClass = new LoggerClass();
  Object.freeze(Logger);
  
  export default Logger;