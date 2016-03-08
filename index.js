var glob           = require('glob')
  , spawn          = require('child_process').spawn
  , fs             = require('fs')
  , exec           = require('shelljs').exec
  , logger         = require('loggy')
  , spawn          = require('child_process').spawn
  , StreamSplitter = require('stream-splitter')
  , ansi_up        = require('ansi_up')
  , http           = require('http')
  , url            = require('url')
  , kill           = require('tree-kill');

function GhcCompiler(config) {
  if (config === null) config = {};
  var options = config.plugins && config.plugins.ghcjs;

  if(options.buildCommand === undefined) options.buildCommand = 'stack build';
  if(options.clearScreen  === undefined) options.clearScreen  = false;
  if(options.placeholder  === undefined) options.placeholder  = "env.ghcjs";
  if(options.interactive  === undefined) options.interactive  = false;
  if(options.ghciCommand  === undefined) options.ghciCommand  = "/usr/bin/false";
  if(options.autoReload   === undefined) options.autoReload   = true;

  this.outfileGlob = '.stack-work/install/x86_64-*/*/ghcjs-*/bin/' + options.projectName + '.jsexe/all.js';

  this.options = options;
  this.globPattern = "app/**/*.hs";

  var _this = this;

  if(this.options.interactive) {
    this.setupServer();
    this.startInteractive();

    process.on('exit', function() {
      _this.teardown();
    });
  }
}

GhcCompiler.prototype.brunchPlugin = true;
GhcCompiler.prototype.type = 'javascript';
GhcCompiler.prototype.extension = 'ghcjs';

GhcCompiler.prototype.setupServer = function() {
  var _this = this;
  this.server = http.createServer().listen(9886);

  this.server.on('request', function(req, resp) {
    var u = url.parse(req.url);
    if (u.pathname === '/reload') {
      if(_this.options.clearScreen) console.log("\x1b[2J\x1b[1;1H");
      logger.info("Requesting code reload");
      _this.ghci.stdin.write("\n\n:reload\n");
      resp.write('OK');
    } else if (u.pathname === '/link') {
      if(_this.options.clearScreen) console.log("\x1b[2J\x1b[1;1H");
      logger.info("Requesting code link");
      _this.ghci.stdin.write("\n\n:reload\n:main\n");
      resp.write('OK');
    } else if (u.pathname === '/restart') {
      if(_this.options.clearScreen) console.log("\x1b[2J\x1b[1;1H");
      logger.info("Restarting GHCJS");
      _this.teardown();
      _this.startInteractive();
      resp.write('OK');
    }
    resp.end();

  });
}

GhcCompiler.prototype.startInteractive = function() {
  var _this = this;

  this.ghci = spawn(this.options.ghciCommand);

  this.ghci.stdin.write(":set prompt \"\"\n");
  this.ghci.stdin.write(":set +t\n\n");

  var handleOut = function (data) {
    var d = data.toString('utf8');
    if (d.indexOf("Linking Template Haskell") !== -1) return; // too many of them!
    d = d.replace(/modules loaded:.*/, "modules loaded.");
    console.info(d);
  };

  this.ghci.stdout.pipe(StreamSplitter("\n")).on('token', handleOut);
  this.ghci.stderr.pipe(StreamSplitter("\n")).on('token', handleOut);
}

GhcCompiler.prototype.teardown = function() {
  if(this.ghci) {
    this.ghci.stdin.write("\n\n\n:quit\n");

    logger.info("Closing GHCI");
    kill(this.ghci.pid, 'SIGKILL')
  }
}

GhcCompiler.prototype.compile = function(data, path, callback) {
  var _this = this;
  if(path == this.options.placeholder) {
    if(this.options.clearScreen) console.log("\x1b[2J\x1b[1;1H");
    if(this.options.interactive)  {
      if(this.options.autoReload) {
        this.ghci.stdin.write("\n\n:reload\n");
      }
      _this.assembly(data, callback);
    } else {
      _this.rebuild(data, callback);
    }
  } else {
    callback(null, "");
  }
};

GhcCompiler.prototype.assembly = function(data, callback) {
  var outfile = this.getFile();
  fs.readFile(outfile, 'utf-8', function(err, compiled) {
    var allsource = "/* from: " + outfile + " */\n\nmodule.exports = (function(){\n " + data + "; \n\n" + compiled + "\n});";
    callback(null, {data: allsource});
  });
};

GhcCompiler.prototype.rebuild = function(data, callback) {
  var _this = this;
  logger.info("Running " + this.options.buildCommand + "...");
  exec(this.options.buildCommand, function(code, output){
    if(code === 0) {
      logger.info("GHCJS-Brunch: stack finished successfully");
      _this.assembly(data, callback);
    } else {
      callback("stack failed (code: " + code + ")", null);
    }
  });
};

GhcCompiler.prototype.sourceFiles = function(callback) {
  var _this = this;
  glob(this.globPattern, {}, function (err, files) {
    if(files){
      files.push(_this.options.projectName + ".cabal");
      files.push("stack.yaml");
    }
    callback(err, files);
  });
};

GhcCompiler.prototype.getFile = function() {
  if(this.options.interactive) {
    return __dirname + "/loader.js";
  }

  var outfiles = glob.sync(this.outfileGlob);

  if (outfiles.length != 1) {
    logger.info("GHCJS-Brunch: More than one all.js file: " + outfiles.join() + ", using first.");
  }
  return outfiles[0];
};

GhcCompiler.prototype.getDependencies = function(data, path, callback) {
  if(path == this.options.placeholder) {
    this.sourceFiles(function (er, files) {
      callback(null, files);
    });
  } else {
    callback(null, []);
  }
};

module.exports = GhcCompiler;
