import {
  addUserToTeam,
  createTeam,
  getGlobal,
  getTeamSetting,
  getUserSetting,
  setGlobalSetting,
  setTeamSetting,
  setUserSetting,
} from "../db";

import {
  all_bots,
  Bot,
  expandVariables,
} from "./bot-base";

import { Pipe } from "../Pipe";

function computeDuration(num: number, unit: string) {
  switch (unit.toLowerCase()) {
    case "sec":
    case "secs":
    case "seconds":
      return num * 1000;

    case "min":
    case "minute":
    case "minutes":
      return num * 60000;

    case "h":
    case "hour":
    case "hours":
      return num * 360000;

    case "ms":
    case "millis":
      return num;
  }
}

module.exports = new Bot("chops", [{
  name: "chops.get",
  help: "read configuration entries from local, team, or global contexts.",
  examples: [
    "get team.package",
  ],
  pattern: /^get\s?(my|team|global)[\.](\S+)$/i,
  handler(m, context) {
    const collection = m[1];
    const key = m[2].trim();

    return new Promise(function (resolve, reject) {
      if (collection === "my") {
        getUserSetting(context.user, key, function (err, entry) {
          if (err || !entry) {
            reject(err || "Key missing!");
          } else {
            context.messages.push(`user.${entry.key} is ${entry.value}`);
            resolve();
          }
        });
      } else if (collection === "team") {
        getTeamSetting(context.user, key, function (err, entry) {
          if (err || !entry) {
            reject(err || "Key missing!");
          } else {
            context.messages.push(`team.${entry.key} is ${entry.value}`);
            resolve();
          }
        });
      } else {
        getGlobal(key, function (err, entry) {
          if (err || !entry) {
            reject(err || "Key missing!");
          } else {
            context.messages.push(`$${entry.key} is ${entry.value}`);
            resolve();
          }
        });
      }
    });
  },
}, {
  name: "chops.set",
  help: "set configuration properties for use in other commands.",
  examples: ["set team.package = 'my_product.v1.release'"],
  pattern: /^set\s(my|team|global)\.(\S+)\s*=\s*(.*)$/i,
  handler(m, context) {
    const collection = m[1];
    const key = m[2];
    const value = m[3];

    return new Promise(function (resolve, reject) {
      if (collection === "my") {
        setUserSetting(context.user, key, value, function (err, previous) {
          if (err) {
            reject(err);
            return;
          }

          context.messages.push(`set user.${key} from ${previous} to ${value}`);
          resolve();
        });
      } else if (collection === "team") {
        setTeamSetting(context.user, key, value, function (err, previous) {
          if (err) {
            reject(err);
            return;
          }

          // TODO maybe embed the team name in here?
          context.messages.push(`set team.${key} from ${previous} to ${value}`);
          resolve();
        });
      } else {
        // todo: perform some kind of admin check.
        setGlobalSetting(key, value, function (err, previous) {
          if (err) {
            reject(err);
            return;
          }

          // global? what do?
          // do we restrict these?
        });
      }
    });
  },
}, {
  name: "chops.add-to-team",
  about: "add user as a member of your team. requires team admin.",
  help: "add <user-name> to team",
  examples: [],
  pattern: /^add (\S+) to team$/i,
  handler(m, context) {

    console.log("chops.add-to-team (" + m[1] + ")");

    return new Promise(function (resolve, reject) {
      const user = m[1].trim();
      const owner = context.user;
      const userId = context.resolveUserId(user);

      if (!userId) {
        context.messages.push(`I'm afraid I don't know ${user}...`);
        reject();
        return;
      }

      addUserToTeam(userId, owner, function (err) {
        if (err) {
          reject(err);
          return;
        }

        context.messages.push("New member added!");
        resolve();
      });
    });
  },
}, {
  name: "chops.team",
  about: "team management functions",
  help: "create team <team-name>",
  examples: [
    "create team Dream Team | set team.motto=Dream On!",
  ],
  pattern: /^create team (.*)$/i,
  handler(m, context) {
    return new Promise(function (resolve, reject) {
      const name = m[1].trim();
      const owner = context.user;

      createTeam(name, owner, function (err, team) {
        if (err) {
          reject(err);
        } else {
          context.messages.push(`Created new team: ${name}`);
          resolve(team);
        }
      });
    });
  },
}, {
  name: "chops.at",
  about: "schedule a pipeline continuation later",
  help: "at <time> <date>",
  examples: [
    "at 10:30 today | tell @channel 'this won't display til later'",
  ],
  pattern: /^at (\d{2}):?(\d{2})?(AM|PM)?\s?(today|tomorrow)?$/i,
  handler(m, context) {
    return new Promise((resolve) => {
      // hour, minute, am|pm, today|tomorrow
      let hour = +(m[1]);
      const minute = +(m[2]);
      const meridian = (m[3]);
      const date = (m[4]);

      if (meridian === "pm" || meridian === "PM") {
        hour += 12;
      }

      const now = new Date();
      const then = date === "tomorrow"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);

      const duration = now.getTime() - then.getTime();
      console.log("delaying command execution for " + duration);
      setTimeout(resolve, duration);
    });
  },
}, {
  name: "chops.delay",
  about: "delay parts of a pipeline",
  help: "delay <duration> <units?>",
  examples: [
    "delay 10000 ms | echo 'this won't fail until 10 seconds from now'",
  ],
  pattern: /^delay (\d+)\s?(?:\w+)?$/i,
  handler(m, context) {
    const duration = computeDuration(+(m[1]), m[2]);

    console.log("delaying command execution for " + duration);
    return new Promise((resolve) => {
      setTimeout(resolve, duration);
    });
  },
}, {
  name: "chops.run",
  about: "Turns your slack chat into a command shell.",
  help: "Runs a command pipe stored in a variable.",
  examples: [
    "run my.pipe",
  ],
  pattern: /^run\s(.*)$/i,
  handler(m, context) {
    const line = m[1];

    return expandVariables([line], context).then(function (expanded) {

      // initializes a new pipe, and connects it to the old one
      const pipe = new Pipe(context.user, context.channel, expanded[0], context);

      pipe.replyTo(function (message) {
        // copy to the outer context.
        context.messages.push(message);
      });

      return pipe.exec();
    });
  },
}, {
  name: "chops.expand",
  about: "allows for expansion of veriables and commands for testing.",
  help: "expand <any> <command> <args>",
  examples: [
    "expand build team.project | deploy my.package to $DEV",
  ],
  pattern: /^expand\s(.*)$/i,
  handler(m, context) {
    return expandVariables(m[1], context).then((expanded) => {
      context.messages.push("Expanded to: " + expanded[0].substring(7));
    }, function fail() {
      context.messages.push("Unable to expand...");
    });
  },
}, {
  name: "chops.help",
  help: "help [ <command-name> | <bot-name> ]",
  pattern: /^help\s*(\S+)?(:?-v)?$/i,
  handler(m, result) {

    const bots = all_bots;
    const cmd = m[1];

    if (cmd) {
      for (const bot of bots) {

        for (const command of bot.commands) {
          const parts = command.name.split(".");

          // we say that for a single command by name, we do dump examples.
          if (parts[0] === cmd || parts[1] === cmd) {
            bot.help(command, result, true);
          }
        }
      }
    } else {
      bots.forEach((bot) => {
        bot.commands.forEach((command) => {
          bot.help(command, result, !!m[3]);
        });
      });
    }

    return Promise.resolve();
  },
}]);
