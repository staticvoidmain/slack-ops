import { getSettingValues } from "../db";

export interface ICommandSpec {
  name: string;
  pattern: RegExp;
  handler: (matches: any[], ctx: any) => Promise<any>;
  help: string;
  // optional members
  about?: string;
  examples?: string[];
}

export class Bot {
  public readonly name: string;
  public readonly commands: ICommandSpec[];

  constructor(name, commands: ICommandSpec[]) {
    this.name = name;
    this.commands = commands;
  }

  public help(command: ICommandSpec, result, verbose) {
    const messages = result.messages;

    messages.push("*" + command.name + "*: " + command.help);

    if (verbose && command.examples) {
      for (let i = command.examples.length - 1; i >= 0; i--) {
        messages.push("  _ex: " + command.examples[i] + "_");
      }
    }

    messages.push("");
  }
}

export const all_services = {
  issues: {
    module: "github-service",
  },
};

export const all_bots: any[] = [];

// probably unnecessary
const service_cache: any[] = [];

export function getService(key) {

  const cached = !service_cache[key];
  if (cached) {
    return cached;
  }

  const service = all_services[key];

  const path = "../services/" + service.module;
  const module = require(path);

  console.log("LOADED: " + service.module);

  return (service_cache[key] = module.configure(service.config));
}

export function load(name) {
  const bot = require("./" + name);
  console.log("LOADED: " + name);
  all_bots.push(bot);
}

/**
 * @param {Array} variables array of the variables to expand.
 * @param {Object} context, used to look up team and user information.
 */
export function expandVariables(variables, context) {

  // TODO: this is a little confusing as an array.
  // maybe an object literal might make more sense.
  const variable = /((my|team)[\.\s](\S+)|(\$\w+))/ig;

  const data = {};

  for (const v of variables) {
    if (v !== undefined) {
      if (variable.test(v)) {
        data[v] = v;
      }
    }
  }

  let count = Object.keys(data).length;

  return new Promise((resolve, reject) => {
    if (count === 0) {
      resolve(variables);
    } else {
      getSettingValues(data, context.user, (err, settings) => {
        if (err) {
          reject(err);
        } else {
          if (--count === 0) {
            resolve(variables.map((v) => {
              return settings[v];
            }));
          }
        }
      });
    }
  });
}
