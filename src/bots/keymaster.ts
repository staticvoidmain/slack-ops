import { Bot } from "./bot-base";

/**
 * are you the gatekeeper?
 */
function ensurePrivate(context) {
    const channel = context.channel;
    const direct = channel.substring(0, 1) === "D";

    return direct;
}

// TODO: ensure that he stores things in the keyring and NEVER in the public settings.
// these keys should never be leaked to the console.
module.exports = new Bot("keymaster", [{
  name: "keymaster.auth",
  pattern: /^auth (\w+) (\w+) (\w+)$/i,
  handler(match, context) {

    return new Promise((resolve, reject) => {
      if (ensurePrivate(context)) {
        context.messages.push("Not implemented anyway.");
        resolve();
      } else {
        // quickly edit the message? or just hope that silly fool does it.
        reject("Are you crazy? We can talk here.");
      }
    });
  },
}]);
