// node review.js U|E N — наступні N нерозібраних
const fs=require("fs");const r=JSON.parse(fs.readFileSync(__dirname+"/cmp.json"));
const done=new Set(fs.existsSync(__dirname+"/reviewed.txt")?fs.readFileSync(__dirname+"/reviewed.txt","utf8").split("\n"):[]);
const [dir,N]=[process.argv[2],+process.argv[3]];
const list=(dir==="U"?r.ua.soft.map(x=>({...x,t:"s"})).concat(r.ua.bad.map(x=>({...x,t:"b"}))):r.en.soft.map(x=>({...x,t:"s"})).concat(r.en.bad.map(x=>({...x,t:"b"})))).filter(x=>!done.has(x.k));
const out=list.slice(0,N);let i=0;
for(const x of out){i++;
 if(dir==="U")console.log(i+". "+x.prompt+" → "+x.google+" {"+x.galts.slice(0,5).join(",")+"} | "+x.card+(x.ea?" +["+x.ea+"]":"")+(x.other.length?" | інша:"+x.other.join(";"):""));
 else console.log(i+". "+x.en+" → "+x.google+" {"+x.galts.slice(0,5).join(",")+"} | "+x.card.replace(/^[^=]*= /,""));}
fs.writeFileSync(__dirname+"/batch-keys.json",JSON.stringify(out.map(x=>({k:x.k,c:x.c}))));
console.error("лишилось",list.length);
