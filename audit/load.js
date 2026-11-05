const fs=require("fs"),vm=require("vm");
const src=fs.readFileSync(require("path").join(__dirname,"..","dict.js"),"utf8")+"\n;this.WORDS=WORDS;this.HINTS=HINTS;this.TRANS=TRANS;";
const ctx={};vm.createContext(ctx);vm.runInContext(src,ctx);
module.exports=ctx;
