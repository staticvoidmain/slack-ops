
// this is just a prototype because we don't have any key information for
// our other enterprisey bug tracker.
const GitHubApi = require("github");

let _github_config: any;

module.exports = {
  configure(config) {
    _github_config = config;

    this.api = new GitHubApi({
      version: "3.0.0",
      protocol: "https",
      host: "api.github.com",
      timeout: 5000,
      headers: {
        // GitHub is happy with a unique user agent
        "user-agent": "slack-webhook-integration/1.0",
      },
    });

    this.api.authenticate({
      type: "oauth",
      token: config.token,
    });

    return this;
  },

  list(path) {
    const self = this;
    const parts = path.split("/");
    const user = parts[0];
    const repo = parts[1];

    return new Promise((resolve, reject) => {
      self.api.issues.repoIssues({
        user,
        repo,
        state: "open",
        sort: "created",
        direction: "asc",
      }, function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  },

  create(path, title, body) {
    const self = this;
    const parts = path.split("/");

    const info = {
      user: parts[0],
      repo: parts[1],
      title,
      body,
    };

    return new Promise((resolve, reject) => {
      self.api.issues.create(info, function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  },

  // TODO: not implemented yet.
  closeIssue() {
    return null;
  },
};
