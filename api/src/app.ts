import { EventEmitter } from "events";
import { devModeCheck, showBanner } from "./common/Banner";
import { PlatformExpress } from "@tsed/platform-express";
import { APIServer } from "./api-server";
import { checkSetup, initSetup } from "./common/setup";
import chalk from "chalk";

// EVENTS
export interface App {
  on(event: "InitSuccess" | string, listener: () => void): this;
}

export class App extends EventEmitter {
  constructor() {
    super();
    process.on("SIGINT", this.stop(this));
    //process.on("SIGQUIT", this.stop(this));
    //process.on("SIGTERM", this.stop(this));
  }

  // INIT ALL COMPONENTS
  public async init() {
    const ctx = this;
    if (process.argv.find((a) => a === "--setup")) {
      await initSetup();
      process.exit(0);
    } else {
      checkSetup()
        .then(async () => {
          showBanner();
          devModeCheck();
          try {
            ctx.emit("InitSuccess");
            ctx.emit("SystemInit");
            const platform = await PlatformExpress.bootstrap(APIServer);
            await platform.listen();
          } catch (error) {
            console.log(error);
          }
        })
        .catch((error) => {
          console.log(chalk.red(error));
          return process.exit(0);
        });
    }
  }

  // STOP ALL COMPONENTS
  public requestStop() {
    this.stop(this)();
  }

  // STOP ALL COMPONENTS
  public stop(ctx: this) {
    return () => {
      process.exit(0);
    };
  }
}
