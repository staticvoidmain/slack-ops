import { Bot, expandVariables, getService } from "./bot-base";

module.exports = new Bot("issue-bot", [{
  name: "issue-bot.create",
  help: "Creates a new issue. Requires setting 'my.project'",
  pattern: /^create issue (.*)$/i,
  examples: [
    "create issue Chops can't submit his own issues. --body and that's just not meta enough.",
  ],
  handler(match, context) {
    const parts = match[1].split("--body");
    const title = parts[0];
    const body = parts[1];

    return expandVariables(["my.project"], context).then(function (expanded) {
      const issues = getService("issues");

      return issues.create(expanded[0], title, body).then(function (list) {

        for (const issue of list) {
          context.messages.push(`<${issue.url}|${issue.title}>`);
        }

        return Promise.resolve();
      });
    });
  },
}, {
  name: "issue-bot.list",
  pattern: /^list issues (.*)$/i,
  help: "Show the current open issues in a given repository.",
  examples: [
    "list issues staticvoidmain/chopsd",
  ],
  handler(match, context) {

    return expandVariables([match[1]], context).then(function (expanded) {
      const issues = getService("issues");

      return issues.list(expanded[0]).then(function (list) {

        for (const issue of list) {
          context.messages.push(`ISSUE: <${issue.url}|${issue.title}>`);
        }

        return Promise.resolve();
      });
    });
  },
}]);
