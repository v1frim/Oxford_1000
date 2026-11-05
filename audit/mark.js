// node mark.js — позначити поточний batch як розібраний
const fs=require("fs");const b=JSON.parse(fs.readFileSync(__dirname+"/batch-keys.json"));
fs.appendFileSync(__dirname+"/reviewed.txt",b.map(x=>x.k).join("\n")+"\n");console.log("marked",b.length);
