// node mk.js out.json '{"1":["a","b"],"5":{"rep":["x","y"]}}' — ops за номерами поточного batch
const fs=require("fs");const b=JSON.parse(fs.readFileSync(__dirname+"/batch-keys.json"));
const m=JSON.parse(fs.readFileSync(0,"utf8"));const ops=[];
for(const[i,v]of Object.entries(m)){const c=b[+i-1].c;ops.push(Array.isArray(v)?{c,[process.argv[3]||"ua"]:v}:{c,...v});}
fs.writeFileSync(process.argv[2],JSON.stringify(ops));console.log(ops.length,"ops");
