/* globals describe, it, beforeEach, afterEach */
const expect = require("chai").expect;
const should = require("chai").should();

import { Api } from "../src/api";

const host = "api.duckduckgo.com";

describe("api", function() {
  describe("#Api", function() {
    it("constructs a new api instance", function(done) {
      const api = new Api("http-bin", "https://httpbin.org", "/status");
      api.get("/200", {}).then(() => {
        done();
      });
    });
  });

  describe("#get", function() {

    it("parses xml", function(done) {
      const api = new Api("duckduckgo", host, "/");
      const data = { q: "DuckDuckGo", format: "xml" };

      api.get("/", data).then((data: any) => {
        // xml is weird.
        should.exist(data.DuckDuckGoResponse.Heading);
        done();
      }).catch(done);
    });

    it("parses json", function(done) {
      const api = new Api("duckduckgo", host, "/");
      const data = { q: "DuckDuckGo", format: "json" };

      api.get("/", data).then(function(data: any) {
        should.exist(data.Heading);
        done();
      }).catch(done);
    });
  });

  describe("#post", function() {
    // TODO: stuff
  });
});
