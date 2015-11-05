#!/usr/local/bin/node

var h$GHCJSi = {
  data: new Buffer(256 * 1024 * 1024),
  dataLength: 0,
  dataOffset: 0,
  loadedSymbols: {},
  current: null,
  sendMessage: h$sendMessage,
  done: h$GHCJSiDone
};

global.h$GHCJSi = h$GHCJSi;
global.require = require;
global.module = module;

var fs = require('fs');

function h$initGHCJSi() {
  process.stdin.setEncoding('utf8');
  process.stderr.setEncoding('binary');
  process.on('uncaughtException', function(err) {
    console.error(err);
    console.error(err.stack);
  });

  process.stdin.on('readable', function() {
    while (true) {
      var str = process.stdin.read();
      if (str) {
        var buf = new Buffer(str, 'hex');
        h$GHCJSi.dataLength += h$GHCJSi.data.write(str, h$GHCJSi.dataOffset + h$GHCJSi.dataLength, h$GHCJSi.data.length - (h$GHCJSi.dataOffset + h$GHCJSi.dataLength), 'hex');
        h$processInput();
      } else {
        return;
      }
    }
  });
  process.stdin.on('close', function() {
    process.exit(0);
  });
}

var h$GHCJSiMessageN = 0;

function h$processInput() {

  while (h$GHCJSi.dataLength >= 8) {
    var msgLength = h$GHCJSi.data.readUInt32BE(0);
    var msgType = h$GHCJSi.data.readUInt32BE(4);
    if (h$GHCJSi.dataLength >= msgLength + 8) {
      var msgPayload = h$GHCJSi.data.slice(h$GHCJSi.dataOffset + 8, msgLength + 8);
      h$GHCJSi.dataOffset += 8 + msgLength;
      h$GHCJSi.dataLength -= 8 + msgLength;

      if (h$GHCJSi.dataLength == 0) h$GHCJSi.dataOffset = 0;

      if (msgType == 0) {
        fs.writeFileSync("www/javascripts/ghcjs.js", msgPayload.toString('utf8'));
        console.log("Linking code");
      }
      if (msgType == 2) {
        fs.appendFileSync("www/javascripts/ghcjs.js",
          " ;\nrequire.register(\"env\", function(exports, require, module) {"
          + "\n  module.exports = function(){"
          + "\n    require('env-interactive')();"
          + "\n    window.h$base_stdin_fd.read = function(fd, fdo, buf, buf_offset, n, c) { c(0); };"
          + "\n    window.h$GHCJSi.current = h$main(h$GHCJSi.loadedSymbols['" + msgPayload.toString('utf8') + "']);"
          + "\n  };"
          + "\n});");
        console.log("Code linked")
      }

      // h$processMessage(msgType, msgPayload);
      h$sendMessage(0, new Buffer(8), null);
      h$GHCJSi.current = null;
    } else return;
  }
}

function h$processMessage(msgType, msgPayload) {
  switch (msgType) {
    case 0: // load initial code/rts and init
      h$loadInitialCode(msgPayload.toString('utf8'));
      h$sendMessage(0);
      break;
    case 1: // load code
      h$loadCodeStr(msgPayload.toString('utf8'));
      h$sendMessage(0);
      break;
    case 2: // run action
      var symb = msgPayload.toString('utf8');
      h$GHCJSi.current = h$main(h$GHCJSi.loadedSymbols[msgPayload.toString('utf8')]);
      break;
    case 3: // abort
      if (h$GHCJSi.current)
        h$killThread(h$GHCJSi.current, h$baseZCControlziExceptionziBasezinonTermination);
      break;
    default:
      throw new Error("unknown message type: " + msgType);
  }
}

function h$GHCJSiDone(thread) {
  h$sendMessage(0);
  h$GHCJSi.current = null;
}

function h$sendMessage(msgType, msg, c) {
  var hdr = new Buffer(8);
  hdr.writeUInt32BE(msg ? msg.length : 0, 0);
  hdr.writeUInt32BE(msgType, 4);
  process.stderr.write(msg ? Buffer.concat([hdr, msg]) : hdr, 'binary', function() {
    if (c) c();
  });
}

// load the RTS and set up the standard streams

function h$loadInitialCode(code) {
  h$loadCodeStr(code, true);

  // don't allow Haskell to read from stdin (fixme!)
  h$base_stdin_fd.read = function(fd, fdo, buf, buf_offset, n, c) {
    c(0);
  };

  // redirect Haskell's stderr to stdout since we use stderr to communicate (fixme!)
  h$base_stderr_fd.write = h$base_stdout_fd.write;
}

function h$loadCodeStr(str) {
  eval.call(null, str);
}

h$initGHCJSi();
