import { join } from "path";

export let _db: any;

/**
 * initialize the db connection and creates the infrastructure tables.
 */
export function init(done) {

  const sqlite = require("sqlite3").verbose();

  _db = new sqlite.cached.Database(join(process.cwd(), "botdb"));

  if (process.env.DEBUG) {
    _db.on("trace", function (query) {
      console.log(`BEGIN ${query}`);
    });
  }

  // TODO: migrations should be handled by some other means. Tables are not dropped explicitly, and so,
  // just changing this code does not ensure that the db is updated correctly.
  _db.serialize(function() {

    _db.run("create table if not exists User ("
    + " user_id text unique,"
    + " team_id integer,"
    + " name text,"
    + " karma real,"
    + " is_bot boolean"
    + ")");

    _db.run("create table if not exists Team (team_id integer primary key, owner text, name text unique )");

    _db.run("create table if not exists GlobalSetting (key text unique, value text )");
    _db.run("create table if not exists UserSetting (user_id text, key text, value text )");
    _db.run("create table if not exists TeamSetting (team_id integer, key text, value text )");

    // todo: can we encrypt this or something? maybe store it in a :memory: db... that would keep people from abusing.
    _db.run("create table if not exists KeyRing (user_id text, service text, token text )");
    _db.run("create table if not exists Task ( task_id integer primary key, task_identifier text, user_id text )");

    console.log("db initialized!");
    done();
  });
}

export function getTeamForUser(userId, done) {

  _db.get("select team_id from User where user_id=?", [userId], function(err, user) {
    if (err) { return done(err); }

    if (!user.team_id) {
      return done(new Error("You are not a member of a team."));
    }

    _db.get("select team_id, owner from Team where team_id = ?", [ user.team_id ], done);
  });
}

// chops appreciates it when you do helpful things,
// like triggering builds, or resolving issues.
// he hates it when you do evil things, like waste his time!
// not sure what karma actually does yet... but whateva
export function adjustKarma(users, delta, done) {
  const update = _db.prepare("update User set karma = karma + ? where user_id = ?");
  for (const user of users) {
    update.run([delta, user]);
  }

  update.finalize(done);
}

export function loadUsers(users, done) {

  const cmd = "insert or ignore into User ("
  + "  user_id, team_id, name, karma, is_bot"
  + ") "
  + "values ($userId, 0, $userName, 100.00, $isBot)";

  _db.serialize(function() {
    const statement = _db.prepare(cmd);
    const keys = Object.keys(users);

    for (const key of keys) {
      const user = users[key];

      statement.run({
        $userId: user.id,
        $userName: user.name,
        $isBot: user.isBot,
      });
    }

    statement.finalize();
  });

  done();
}

export function getUser(slackId, done) {
  _db.get("select * from User where user_id = ? limit 1", [slackId], done);
}

const TEAM_PREFIX = 5;
const MY_PREFIX = 3;

// todo: cache the settings?
// passes the keys, user, and a callback-per-setting?
export function getSettingValues(settings, userId, done) {
  getTeamForUser(userId, function(err, team) {
    if (err) { return done(err); }

    for (const prop in settings) {
      if (settings.hasOwnProperty(prop)) {

        const resolver = (function() {
          return function resolve(selectError, result) {
            if (selectError) { done(selectError); }

            if (result) {
              settings[prop] = result.value;
            }

            done(null, settings);
          };
        })();

        // resolve $global
        if (/\$\w+/i.test(prop)) {
          const globals = "select value from GlobalSetting where key = $key";
          _db.get(globals, { $key: prop.substring(1) }, resolver);
        } else if (/^my.*$/i.test(prop)) {
          // resolve per-use my.settings
          const userSettings = "select value from UserSetting where key = $key and user_id = $userId";
          _db.get(userSettings, {
            $key: prop.substring(MY_PREFIX),
            $userId: userId,
          }, resolver);
        } else {
          // resolve team.setting
          const teamSettings = "select value from TeamSetting where key = $key and team_id = $teamId";

          if (!team) {
            return done({ error: `user ${userId} does not belong to a team` });
          } else {
            _db.get(teamSettings, {
              $key: prop.substring(TEAM_PREFIX),
              $teamId: team.team_id,
            }, resolver);
          }
        }
      }
    }
  });
}

// todo: multiple-membership.
export function addUserToTeam(userId, owner, done) {

  getTeamForUser(owner, function(err, teamInfo) {
    if (err) {
      return done(err);
    }

    // todo: check membership info instead.
    if (teamInfo.owner !== owner) {
      return done(new Error("You are not a member of a team."));
    }

    _db.run("update User set team_id = ? where user_id = ?", [teamInfo.team_id, userId], done);
  });
}

export function getGlobal(key, done) {
  _db.get("select key, value from GlobalSetting where key = ?", [key], done);
}

export function setGlobalSetting(key, value, done) {
  done("TODO");
}

/*
* # Creates a new team, assigns the user as the first memeber and the owner.
* @param {String} name team name
* @param {String} owner chat-id of the owner
* @param {Function} done callback on complete
*/
export function createTeam(name, owner, done) {
  _db.serialize(function() {
    _db.run("insert or ignore into Team (name, owner) values ($name, $ownerId)", {
      $name: name,
      $ownerId: owner,
    }, function insertTeam() {
      _db.get("select team_id from Team where name = $name", {
        $name: name,
      },
        function updateUser(err, team) {
          console.log("assigning user " + owner + " to " + team.team_id);
          _db.run("update User set team_id = $teamId where user_id = $userId", {
            $teamId: team.team_id,
            $userId: owner,
          }, done);
        });
    });
  });
}

export function getTeamSetting(userId, key, done) {
  getTeamForUser(userId, function(err, teamInfo) {
    if (err) {
      return done(err);
    }

    if (!teamInfo) {
      return done(new Error("WTF no team bro!"));
    }

    const teamId = teamInfo.team_id;
    const query = "select key, value from TeamSetting where team_id = ?";

    if (!key || key === "*") {
      _db.each(query, [teamId], done);
    } else {
      _db.get(query + " and key = ? limit 1", [teamId, key], done);
    }
  });
}

export function setTeamSetting(userId, key, value, done) {
  console.log(` db.js setTeamSetting( ${userId}, ${key}, ${value} )`);

  getTeamForUser(userId, function(err, teamInfo) {
    if (err) {
      return done(err);
    }

    if (!teamInfo) {
      return done(new Error("WTF no team bro!"));
    }

    if (teamInfo.owner !== userId) {
      return done(new Error("team settings are locked! owner=" + teamInfo.owner));
    }

    const teamId = teamInfo.team_id;
    const teamQuery = "select key, value from TeamSetting where team_id = ? and key = ?";

    _db.get(teamQuery, [teamId, key], function(selectErr, setting) {
      if (selectErr) {
        done(selectErr);
      } else {
        if (setting) {
          const previous = setting.value;
          _db.run("update TeamSetting set value = ? where team_id = ? and key = ?", [value, teamId, key], function() {
            done(selectErr, previous);
          });
        } else {
          _db.run("insert into TeamSetting (team_id, key, value) values (?, ?, ?)", [teamId, key, value], done);
        }
      }
    });
  });
}

export function getUserSetting(userId, key, done) {
  const query = "select key, value from UserSetting where user_id = ?";

  if (!key || key === "*") {
    _db.each(query, [userId], done);
  } else {
    // apply a limit since we asked for one specific value.
    _db.get(query + " and key = ? limit 1", [userId, key], function(err, row) {
      done(err, row || {
        key,
        value: undefined,
      });
    });
  }
}

export function setUserSetting(userId, key, value, done) {
  const query = "select value from UserSetting where user_id = ? and key = ? limit 1";

  _db.get(query, [userId, key], function(err, row) {
    if (err) {
      done(err);
      return;
    }

    if (row) {
      const previousValue = row.value;
      _db.run("update UserSetting set value = ? where user_id = ? and key = ?", [value, userId, key], function() {
        done(err, previousValue);
      });
    } else {
      _db.run("insert into UserSetting (user_id, key, value) values (?, ?, ?)", [userId, key, value], done);
    }
  });
}

export function close() {
  if (_db) {
    _db.close();
  }
}
