/* globals describe, it, beforeEach, afterEach */
var expect = require("chai").expect;

import { init, _db, getUser, loadUsers } from "../src/db";

describe("wtf", function() {
  it("does stuff", function() {
    expect(true).to.equal(true);
    expect(true).not.to.equal(false);
  });
});

describe("db module", function() {
  describe("#init", function() {

    beforeEach(function(done) {
      init(function() {
        done();
      });
    });

    it("initializes tables", function(done) {
      _db.get("select * from User limit 1", function() {
        done();
        _db.close();
      });
    });

    it("assigns globals", function(done) {

      init(function() {
        _db.getGlobal("asdf", function(err, g) {
          expect(g.key).to.equal("asdf");
          expect(g.value).to.equal("qwer");
          _db.close();
          done();
        });
      });
    });
  });

  describe("#loadUsers", function() {
    it("loads the users", function(done) {
      loadUsers({ "wut": { id: "wut", name: "face"}}, function(err) {
        if (err) { throw err; }

        getUser("wut", function(err, user) {
          expect(user.name).to.equal("face");
          expect(user.karma).to.equal(100);
          done();
        });
      });
    });
  });
});
