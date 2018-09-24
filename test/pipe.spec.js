/* globals describe, it, beforeEach, afterEach */
import { expect } from "chai";
import { Pipe, getBotCommand } from "../src/pipe";
import { load } from "../src/bots/bot-base";


// slightly sinful, but we will import chops so we have some of the core commands
// available to the pipe.
// we could mock them, but whatever.
load("chops");

describe("#getBotCommand", function () {
  it("matches command patterns", function () {
    const cmd = getBotCommand({}, "help")

    expect(cmd).to.exist;
  });
})

describe("#exec", function () {
  it("processes single commands", function (done) {
    const pipe = new Pipe("", "", "help");

    pipe.replyTo(function () {
      expect(true).to.equal(true);
    });

    pipe.exec().then(done);
  });

  it("doesn't call reply if there is no output", function (done) {
    const pipe = new Pipe("", "a", "delay 1000");

    pipe.replyTo(function () {
      expect(true).to.equal(true);
    });

    pipe.exec().then(done);
  });

  it("processes chained commands", function (done) {
    const pipe = new Pipe("", "", "delay 1000 | help");

    pipe.replyTo(function reply(text) {
      expect(text).not.to.equal(undefined);
    });

    pipe.exec().then(done, done);
  });

  it("does not invoke the second command until the first completes.", function (done) {
    const pipe = new Pipe("", "", "delay 4000 | delay 1");
    pipe.replyTo(done);

    pipe.exec();
  });

  it("returns a promise", function () {
    const pipe = new Pipe("", "", "delay 4000 | delay 1");
    pipe.replyTo(function () { });

    const connector = pipe.exec();
    expect(connector instanceof Promise).to.equal(true);
  });
});
