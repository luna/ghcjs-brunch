var glob = require('glob');
var spawn = require('child_process').spawn;
var fs = require('fs')


function GhcCompiler(config) {
  if (config == null) config = {};
  var options = config.plugins && config.plugins.ghcjs;
  this.options = options
}

GhcCompiler.prototype.brunchPlugin = true;
GhcCompiler.prototype.type = 'javascript';
GhcCompiler.prototype.extension = 'ghcjs';

GhcCompiler.prototype.compile = function(data, path, callback) {
  var _this = this;
  if(path == this.options.placeholder) {
    console.log("Running cabal")
    cabal = spawn('cabal', ['install', '--ghcjs'], {},{ stdio: 'inherit' });

    cabal.on('close', function (code) {
      console.log('Cabal exited with code ' + code);
      if(code == 0) {
        fs.readFile('dist/build/'+_this.options.projectName+'/'+_this.options.projectName+'.jsexe/all.js', 'utf-8', function(err, compiled) {
          
          var allsource = "(function(){\n " + data + "; \n\n" + compiled + "\n})();"
          
          callback(null, {data: allsource});
        });
      } else {
        callback("Cabal failed", null);
      }
    });
  } else {
    callback(null, "");
    
  }};

GhcCompiler.prototype.getDependencies = function(data, path, callback) {
  if(path == this.options.placeholder) {
    glob("**/*.hs", {}, function (er, files) {
      callback(null, files)
    });
  } else {
    callback(null, []);
  }
};


module.exports = GhcCompiler;
