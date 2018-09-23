
const xml = require("xml2js");
const qs = require("querystring");

import { IncomingMessage, request } from "http";

const xmlContent = /^(text\/xml|application\/xml).*$/i;
const jsonContent = /^(text\/json|application\/json|application\/x-javascript).*$/i;
const textContent = /^text\/plain$/i;

/**
 * reads a UTF8 response and converts the content based on the convert parameter.
 * @param res
 * @param convert
 */
function readText(res: IncomingMessage, convert) {
  return new Promise(function(resolve, reject) {
    const data: any[] = [];
    res.setEncoding("utf-8");

    res.on("data", function(chunk) {
      data.push(chunk);
    });

    res.on("end", function() {
      resolve(data.join(""));
    });
  }).then(convert);
}

// the NOP case.
function asPlain(text) {
  return Promise.resolve(text);
}

/**
* Parses the text from xml to a javascript object.
* note: This graph *WILL* have some weird names and auto-generated properties.
* @param {String} text the text to process.
* @return {Promise} promise result will contain the parsed object or Error.
*/
function asXml(text) {
  return new Promise(function(resolve, reject) {
    try {
      const parser = xml.Parser();

      parser.parseString(text, function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

function asJson(text) {
  return new Promise(function(resolve, reject) {
    try {
      resolve(JSON.parse(text));
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
* Api wrapper for services without formal api packages.
* ### Examples:
*   new Api("echo", "httpbin.com", "/")
*     .post('post', { msg: 'hello world!' })
*     .then(function() { console.log("we did it!"); });
*
* @param {String} name the name of the api, used for debugging messages.
* @param {string} host name of the remote host (ex: www.google.com )
* @param {String} root relative path to the api root (ex: /api/v2/ )
* @return {Api} constructs a new Api instance.
*/
export class Api {

  constructor(
    private name: string,
    private host: string,
    private root: string) { }

  /*
  * ## Issues an HTTP GET to a resource.
  *
  * @param {String} path relative path from the root for the action ( ex: Posts/1 )
  * @param {Object} data an object literal to add to the query string (optional)
  * @return {Promise} fulfilled when the get has returned.
  */
  public get(path, data) {
    const self = this;
    const options = this.createOptions("GET", path);

    if (data) {
      options.path += "?" + qs.stringify(data);
    }

    return new Promise(function(resolve, reject) {
      const req = request(options, function(res) {
        let format = asPlain;

        self.debug(`${res.statusCode} path=${path}`);

        const type = res.headers["content-type"];
        if (type) {
          if (jsonContent.test(type)) {
            format = asJson;
          } else if (xmlContent.test(type)) {
            format = asXml;
          }
        }

        resolve(readText(res, format));
      });

      req.on("error", function(error) {
        reject(error);
      });

      req.end();
    });
  }
  /**
   * Sends an HTTP POST to the given endpoint, optionally passing some data with
   * a specified encoding type.
   *
   * ### Examples:
   * api.post('messages', { msg: 'hello world!' });
   *
   * @param {String} path to the resource
   * @param {Object} data to send to the server (optional)
   * @param {string} encoding for the data (optional, default=json)
   * @return {Promise} fulfilled when the post completes.
   * @api public
   */
  public post(path, data, encoding) {
    // TODO: support other encodings and shit. needs more work.
    const self = this;
    const options = this.createOptions("POST", path);

    let body;
    if (data) {
      if (!encoding || encoding === "json") {
        body = JSON.stringify(data);
      } else {
        body = qs.stringify(data);
        options.headers["Content-Type"] = "application/x-www-form-urlencoded";
      }

      options.headers["Content-Length"] = Buffer.byteLength(body);
    }

    return new Promise(function(resolve, reject) {
      const req = request(options, function(res) {
        self.debug(`${res.statusCode} ${path}`);

        resolve();
      });

      req.on("error", function(error) {
        reject(error);
      });

      if (data) {
        req.write(data);
      }

      req.end();
    });
  }

  private createOptions(method, path) {
    return {
      method,
      hostname: this.host,
      headers: {},
      path: this.root + path,
    };
  }

  private debug(message, data?) {
    console.log(this.name + ": " + message);

    if (data) {
      console.dir(data, {
        colors: true,
      });
    }
  }
}
