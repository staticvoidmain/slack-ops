import { createInterface } from "readline";
import { Pipe } from "../pipe";
import { ChatProvider } from "./slack";

export class ConsoleProvider implements ChatProvider {
  // just fake out the local testing.
  private users: any = {};

  public resolveUser(id) {
    return this.users[id];
  }

  public resolveUserId(name) {
    const keys = Object.keys(this.users);

    for (const key of keys) {
      const user = this.users[key];
      if (user.name === name) {
        return user.id;
      }
    }

    return null;
  }

  public resolveUserName(id) {
    const user = this.users[id];
    return user && user.name;
  }

  public start() {

    const repl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const reply = (message) => {
      console.log("CHOPS: " + message);
    };

    repl.on("line", (line) => {

      if (!line || /^CHOPS:/.test(line)) {
        return repl.prompt(false);
      }

      // don't double parse chops output.
      const pipe = new Pipe("0", "general", line, this);

      if (pipe.hasWork()) {
        console.log("CHOPS: working...");

        pipe.replyTo(reply);
        pipe.exec().then(() => {
          console.log("CHOPS: done!");
          repl.prompt(false);
        });
      }
    });

    repl.prompt(false);
  }
}
