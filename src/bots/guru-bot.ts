
import { adjustKarma } from "../db";
import { Bot } from "./bot-base";

module.exports = new Bot("guru-bot", [{
  name: "guru-bot.blame",
  pattern: /^blame (\S+)(?:\s(.*))?$/i,
  handler(match, context) {
    const userName = match[1];
    const userId = context.resolveUserId(userName);

    if (!userId) {
      return Promise.reject("I'm afraid I don't know this person...");
    }

    return new Promise(function(resolve, reject) {
      adjustKarma(userId, -5, function(err) {
        if (err) {
          reject(err);
        } else {

          adjustKarma(context.user, -5, function(err) {

            if (err) {
              reject(err);
              return;
            }

            const sender = context.resolveUserName(context.user);
            context.messages.push(`We reap what we sow, ${sender}.`);
            context.messages.push(`${userName}'s karma has been damaged, and so has yours.`);
            resolve();
          });
        }
      });
    });
  },
}, {
  name: "guru-bot.praise",
  pattern: /^praise (\S+)(?:\s(.*))?$/i,
  handler(match, context) {
    const userName = match[1];
    const user = context.resolveUser(userName);
    // todo: match[2] will be a reason.

    if (!user) {
      return Promise.reject("I'm afraid I don't know this person...");
    }

    return new Promise(function(resolve, reject) {
      adjustKarma(user.id, +5, function(err) {
        if (err) {
          reject(err);
        }

        const sender = context.resolveUserName(context.user);
        context.messages.push(`${userName}'s karma has improved.`);

        if (!user.isBot) {
          adjustKarma(context.user, +1, function(err) {

            if (err) {
              reject(err);
              return;
            }

            context.messages.push(`What goes around comes around, ${sender}.`);
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  },
}, {
  name: "guru-bot.enlighten",
  pattern: /^enlighten me$/i,
  handler(match, context) {
    return new Promise(function(resolve, reject) {
      context.messages.push(`*Dharma of Code*:

  - _doing_ work is more important than _talking about work_.
  - testing your code is a *good* thing.
  - praise others often, and you may find benefit yourself.
  - complaints are bad for morale, but sometimes necessary.
  - performing code reviews is good for the team.
  - enlightened people say please and thank you.
  - swearing is _okay_, just don't be *rude*.`);

      resolve();
    });
  },
}]);
