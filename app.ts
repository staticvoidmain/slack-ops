import { bots } from "./src/conf";
import { init as db_init } from "./src/db";

import { load as load_bot } from "./src/bots/bot-base";
import { ConsoleProvider } from "./src/providers/console";
import { SlackProvider } from "./src/providers/slack";

db_init(function ready() {

  bots.forEach(function(name) {
    load_bot(name);
  });

  let provider: any = new SlackProvider();

  if (process.argv.indexOf("--debug") > -1) {
    console.log("using ConsoleProvider");
    provider = new ConsoleProvider();
  }

  console.log("starting provider...");
  provider.start();
});
