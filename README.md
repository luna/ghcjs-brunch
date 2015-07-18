## ghcjs-brunch
Adds [GHCJS](https://github.com/ghcjs/ghcjs) support to
[brunch](http://brunch.io).

## Installation
Install the plugin via npm with `npm install --save ghcjs-brunch`.

Or, do manual install:

* Add `"ghcjs-brunch": "x.y.z"` to `package.json` of your brunch app.
  Pick a plugin version that corresponds to your minor (y) brunch version.
* If you want to use git version of plugin, add
`"ghcjs-brunch": "git+ssh://git@github.com:kfigiela/ghcjs-brunch.git"`.

## Configuration

```coffee
exports.config =
  files:
    javascripts:
      joinTo:
        ...
        'javascripts/ghcjs.js': /^app\/.*\.ghcjs$/
  ...
  conventions:
    assets: /(assets|vendor\/assets)/
    ignored: [
          /[\\/]_/
          /vendor[\\/](node|j?ruby-.*|bundle)[\\/]/
          /ghcjs-live\.js$/
        ]
  plugins:
    ghcjs:
      placeholder:  'app/env.ghcjs' # name of placeholder file
      projectName:  'gui'           # cabal project name
      buildCommand: 'cabal install' # you may want to provide some additional flags, etc.
      clearScreen:  false           # should clear terminal when running buildCommand
      interactive:  false           # enable interactive mode
      ghciCommand:  "./interactive" # command that starts ghcjs --interactive --package-db ... -package ... Main.hs in the right CWD
  overrides:
    interactive:
      conventions: ignored: [
          /[\\/]_/
          /vendor[\\/](node|j?ruby-.*|bundle)[\\/]/
        ]
      plugins: ghcjs: interactive: true
```

## License

The MIT License (MIT)

Copyright (c) 2015 Kamil Figiela (http://kfigiela.github.io)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
