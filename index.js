var glob = require('glob');
var spawn = require('child_process').spawn;
var fs = require('fs');
var exec = require('shelljs').exec;

function GhcCompiler(config) {
  if (config === null) config = {};
  var options = config.plugins && config.plugins.ghcjs;
  this.options = options;
  this.globPattern = "./**/*.hs";
}

GhcCompiler.prototype.brunchPlugin = true;
GhcCompiler.prototype.type = 'javascript';
GhcCompiler.prototype.extension = 'ghcjs';

GhcCompiler.prototype.compile = function(data, path, callback) {
  var _this = this;
  if(path == this.options.placeholder) {
    this.recompileIfChanged(function(shouldRebuild) {
      if(shouldRebuild) {
        _this.rebuild(data, callback);
      } else {
        _this.assembly(data, callback);
        console.log("Cabal sources not changed, skipping");
      }
    });
  } else {
    callback(null, "");
  }
};

GhcCompiler.prototype.assembly = function(data, callback) {
  var outfile = this.getFile();
  fs.readFile(outfile, 'utf-8', function(err, compiled) {
    var allsource = "/* from: " + outfile + " */\n\nwindow.ghcjs = (function(){\n " + data + "; \n\n" + compiled + "\n});";
    callback(null, {data: allsource});
  });  
};

GhcCompiler.prototype.rebuild = function(data, callback) {
  var _this = this;
  console.log("Running cabal install...");
  exec('cabal install --ghcjs', function(code, output){
    if(code === 0) {
      console.log("Cabal finished successfully");
      _this.assembly(data, callback);
    } else {
      callback("Cabal failed (code: " + code + ")", null);
    }
  });
};

GhcCompiler.prototype.sourceFiles = function(callback) {
  var _this = this;
  glob(this.globPattern, {}, function (err, files) {
    if(files) files.push(_this.options.projectName + ".cabal");
    callback(err, files);
  });
};

GhcCompiler.prototype.getFile = function() {
  var outfiles = glob.sync('dist/dist-sandbox-*/build/'+this.options.projectName+'/'+this.options.projectName+'.jsexe/all.js');
  outfiles.push('dist/build/'+this.options.projectName+'/'+this.options.projectName+'.jsexe/all.js');

  if (outfiles.length != 1) {
    console.log("More than one all.js file: " + outfiles.join() + ", using first.");
  }
  return outfiles[0];
};


function mtimeOrEmpty(name) {
  try {
    return fs.statSync(name).mtime;
  } catch(err) {
    return "";
  }   
}

GhcCompiler.prototype.recompileIfChanged = function(callback) {
  var _this = this;
  this.sourceFiles(function (err, files) { // TODO: add error handling
    var max_mtime = Math.max.apply(null, files.map(mtimeOrEmpty).sort());
    var outfile = glob.sync(_this.getFile());
    var last_compiled = mtimeOrEmpty(outfile);
    callback(process.env.RECOMPILE || max_mtime > last_compiled);
  });
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
