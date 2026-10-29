const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const cache = new Map();
function load(file) {
 file=path.resolve(file);if(cache.has(file))return cache.get(file);
 const m={exports:{}};cache.set(file,m.exports);
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${js}\n})`,{filename:file})((name)=>name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts')):require(name),m,m.exports);
 return m.exports;
}
module.exports={load};
