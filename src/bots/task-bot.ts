
import { Bot } from "./bot-base";

module.exports = new Bot("task-bot", [{
  name: "task-bot.list_tasks",
  help: "list tasks [ like <pattern> ]",
  examples: [
    "list tasks",
    "list tasks like deploy",
  ],
  pattern: /^list tasks(:? like (.*))?$/i,
  handler(m, ctx) {
    ctx.messages.push("not implemented");

    return Promise.resolve();
  },
}]);
