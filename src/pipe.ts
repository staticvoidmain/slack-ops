import { EOL } from "os";
import { all_bots } from "./bots/bot-base";
import { ChatProvider } from "./providers/slack";

export type CommandFunc = undefined | (() => void);

/**
 * matches text against all the bot patterns
 * @param ctx pipe context to pass around
 * @param text the message text to match against the command patterns.
 */
export function getBotCommand(ctx, text): CommandFunc {

  for (const bot of all_bots) {
    for (const command of bot.commands) {
      const match = command.pattern.exec(text);

      if (match) {
        return command.handler.bind(null, match, ctx);
      }
    }
  }

  return undefined;
}

/*
* ## Constructor
* Creates a new pipe instance which can process messages.
*
* @param {String} user UserIdentifier for the current chat provider.
* @param {String} line the line of text to process.
* @param {Function} a callback to process IF the pipeline got any messages.
*/
export class Pipe {

  private readonly ctx: any = undefined;
  private readonly commands: any[] = [];

  private reply: any = undefined;
  private work: number = 0;

  // we start with a fulfilled promise.
  private current = Promise.resolve();
  private resolve: any = undefined;

  constructor(user: string, channel: string, line: string, provider?: ChatProvider) {

    const messages: string[] = [];

    this.ctx = {
      channel,
      user,
      line,
      messages,
      env: {},
    };

    if (provider) {
      Object.assign(this.ctx, {
        resolveUser: provider.resolveUser.bind(provider),
        resolveUserId: provider.resolveUserId.bind(provider),
        resolveUserName: provider.resolveUserName.bind(provider),
      });
    }

    const cmds = line.split("|");

    for (const part of cmds) {
      const cmd = part.trim();
      const command = getBotCommand(this.ctx, cmd);

      if (command) {
        this.commands.push(command);
      }

      // if not, error?
    }

    this.work = this.commands.length;
  }

  public replyTo(reply) {
    this.reply = reply;
  }

  public hasWork() {
    return this.work > 0;
  }

  public getWorkScore() {
    const len = this.commands.length;
    return len * len;
  }

  public exec() {
    if (this.commands.length) {
      this.current
        .then(this.next.bind(this))
        .catch((error) => {
          console.log("PIPE_ERROR: ", error);
          this.reply("ERROR: " + error);
        });
    }

    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  private flush() {
    if (this.ctx.messages.length > 0) {
      this.reply(this.ctx.messages.join(EOL));
      this.ctx.messages.length = 0;
    }
  }

  private next() {
    const command = this.commands.shift();

    if (command) {
      return command().then(this.next.bind(this));
    }

    this.flush();
    this.resolve();
  }
}
