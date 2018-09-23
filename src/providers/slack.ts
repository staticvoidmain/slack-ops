import { adjustKarma, getUser, loadUsers } from "../db";
import { Pipe } from "../pipe";
import { getEmoji, updateWorkload } from "../soul";

const slackMentionToken = /^<@(\w+)>$/i;

export interface ChatProvider {
  /**
   *
   * @param mention
   */
  resolveUser(mention): any | undefined;

  /**
   * gets the userid for a given user name
   * @param name
   */
  resolveUserId(name: string): number;

  resolveUserName(id: number): string;
}

export class SlackProvider implements ChatProvider {

  private users: any = {};
  private channels: any = {};
  private slack: any;
  private loaded: boolean = false;

  // extract a username from slack mention syntax
  public resolveUser(mention) {
    const match = slackMentionToken.exec(mention);

    if (match) {
      return this.users[match[1]];
    }
  }

  public resolveUserId(name) {
    const match = slackMentionToken.exec(name);

    if (match) {
      return match[1];
    }

    const keys = Object.keys(this.users);

    for (let i = 0; i < keys.length; i++) {
      const user = this.users[keys[i]];
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
    const SlackBot = require("slackbots");

    this.slack = new SlackBot({
      token: process.env.SLACK_TOKEN,
      name: "Chops",
    });

    this.slack.on("start", () => {
      for (let i = 0; i < this.slack.users.length; i++) {
        const user = this.slack.users[i];

        // is deleted eh?
        if (!user.deleted) {
          this.users[user.id] = {
            id: user.id,
            name: user.name,
            // HMM... name === real_name? What's up there?
            isBot: user.is_bot || (user.name === user.real_name),
          };
        }
      }

      for (let i = 0; i < this.slack.channels.length; i++) {
        const channel = this.slack.channels[i];

        this.channels[channel.id] = {
          id: channel.id,
          name: channel.name,
        };
      }

      loadUsers(this.users, (err) => {
        if (err) { throw err; }

        console.log("users loaded!");
        this.loaded = true;
      });
    });

    this.slack.on("message", this.handleMessage);
  }

  private handleMessage(data) {
    if (!this.loaded) { return; }

    if (data.type !== "message") {
      return;
    }

    // it's a bot message. skip.
    if (data.user === undefined) {
      return;
    }

    let channel = this.channels[data.channel];
    const user = this.users[data.user];

    let postMethod = "postMessageToChannel";

    if (!channel) {
      // keep from spamming your team, or you want to use complain silently.
      // or keep a SECRET
      channel = {
        name: data.channel,
      };

      postMethod = "postMessage";
    }

    const send = this.slack[postMethod];
    const channelName = channel.name;
    const provider = this;

    console.log(`${data.ts} ${user.name} -> + ${channelName} : ${data.text}`);

    getUser(user.id, function(err, userStats) {
      if (err) {
        console.error("ERROR: ", err);
        return;
      }

      const pipe = new Pipe(data.user, channelName, data.text, provider);

      if (pipe.hasWork()) {

        const reply = function(response) {
          const emoji = getEmoji(userStats);

          console.log(`sending ${response} to ${channelName}`);

          send(channelName, response, {
            icon_emoji: emoji.icon,
          }, function callback(resp) {
            if (!resp.ok) {
              console.error("SLACK_ERROR: " + JSON.stringify(resp));
            }
          });
        };

        pipe.replyTo(reply);

        pipe.exec().then(function() {
          // todo: adjust karma by the amount of work you had chops do

        });
      } else {
        // TODO: for non-commands pipe the text to the karma adjusting code
        // look for agreeableness markers like please, thanks, sorry etc.
        // and _silently_ improve the karma of the user by a tiny bit.
        // LINK -> http://emotion-research.net/toolbox/toolboxdatabase.2006-10-13.2581092615
      }
    });
  }
}
