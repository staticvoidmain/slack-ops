
import { Bot } from "./bot-base";

// todo: this guy needs db support.
// I guess they all kinda do.
module.exports = new Bot("task-bot", [{
	name: "task-bot.list_tasks",
	help: "list tasks [ like <pattern> ]",
	examples: [
		"list tasks",
		"list tasks like deploy",
	],
	pattern: /^list tasks(:? like (.*))?$/i,
	handler(m, result) {
		result.messages.push("not implemented");
	},
}]);
