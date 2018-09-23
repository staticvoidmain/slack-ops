
import { get, IncomingMessage } from "http";
import { escape } from "querystring";
import { Bot } from "./bot-base";

function readJson(res: IncomingMessage, callback, fail) {
  const data: Buffer[] = [];
  res.on("data", function(chunk) {
    data.push(chunk);
  });

  res.on("end", function() {
    try {
      const buffer = Buffer.concat(data);

      callback(JSON.parse(buffer.toString("utf8")));
    } catch (ex) { fail(ex); }
  });
}

module.exports = new Bot("duck-bot", [{
  name: "duckbot.answer",
  about: "Ask a question, and a friendly duck will lookup your answer.",
  help: "find <search-term>",
  examples: [
    "what is love",
    "find waldo",
  ],
  pattern: /^(?:what is|define|lookup|find|search|google) (.*)$/i,
  handler(m, result) {
    const options = "&skip_disambig=1&no_redirect=1&format=json&t=chops_duckbot";

    const query = m[1];
    result.messages.push("let me see what I can find about " + query + "...");

    return new Promise(function(resolve, reject) {

      // todo: error handling
      get("http://api.duckduckgo.com/?q=" + escape(query) + options, function(res) {

        readJson(res, function(response) {
          const simple = response.Answer || response.Abstract || response.AbstractText || response.Definition;

          if (simple) {
            result.messages.push(response.Heading + ": " + simple);
          } else if (response.AbstractURL) {
            result.messages.push("Check this out -> " + response.AbstractURL);
          } else if (response.Results.length > 0) {
            result.messages.push("Maybe one of these?");
            result.messages.push(JSON.stringify(response.Results, undefined, " "));
          } else {
            result.messages.push("Does any of this make sense to you!?");
            result.messages.push(JSON.stringify(response, undefined, " "));
          }

          resolve();
        }, reject);
      });
    });
  },
}]);
