import { EOL } from "os";
import { all_bots } from "./bots/bot-base";
import { ChatProvider } from "./providers/slack";

/**
 * matches text against all the bot patterns
 * @param ctx pipe context to pass around
 * @param text the message text to match against the command patterns.
 */
function getBotCommand(ctx, text) {

  for (let botIndex = 0; botIndex < all_bots.length; botIndex++) {
    const bot = all_bots[botIndex];

    for (let i = 0; i < bot.commands.length; i++) {
      const command = bot.commands[i];
      const match = command.pattern.exec(text);

      if (match) {
        return command.handler.bind(null, match, ctx);
      }
    }
  }

  return undefined;
}

/**
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

    for (let pipeStage = 0; pipeStage < cmds.length; pipeStage++) {
      const cmd = cmds[pipeStage].trim();
      const command = getBotCommand(cmd, this.ctx);

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
        .then(this.next)
        .catch(this.fail);
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

  private next(arg) {
    const command = this.commands.shift();

    if (command) {
      this.current = command(arg)
        .then(this.next);

      // what was the defer stuff?
    } else {
      this.current.then(() => {
        // flag the pipe as complete.
        this.flush();
        this.resolve();
      });
    }

    return this.current;
  }
  private fail(error) {
    console.log("PIPE_ERROR: " + JSON.stringify(error));
    this.reply("ERROR: " + error);

    throw new Error(error);
  }
}
