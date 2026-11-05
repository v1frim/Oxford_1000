const fs=require("fs"),d=require(__dirname+"/load.js");const W=d.WORDS;
const G={};for(const l of fs.readFileSync(__dirname+"/gt-cache.jsonl","utf8").split("\n"))if(l){const o=JSON.parse(l);G[o.sl+"|"+o.q]=o;}
const getEn=w=>[].concat(w.en),getUa=w=>[].concat(w.ua);
const bare=u=>String(u).replace(/\s*\([^)]*\)/g,"").trim();
const nEn=s=>s.toLowerCase().replace(/[’`]/g,"'").replace(/[.!?,;:]+$/,"").replace(/^(to|a|an|the)\s+/,"").replace(/^(to|a|an|the)\s+/,"").replace(/\s+(of|to)$/,"").trim();
const UV=/^(клад|дач|прав|ступ)/,V="аеєиіїоуюя";
const uv=w=>w==="в"?"у":(w.length>2&&(w[0]==="в"||w[0]==="у")&&!V.includes(w[1])&&!UV.test(w.slice(1)))?"у"+w.slice(1):w;
const C=new Set(["й","і","та"]);const dc=w=>{const k=w.filter(x=>!C.has(x));return(w.length>=3&&k.length>=2)?k:w;};
const nUa=s=>dc(bare(s).toLowerCase().trim().replace(/[’ʼ‘`´]/g,"'").replace(/г/g,"ґ").replace(/[.!?]+$/,"").replace(/[,;:]/g,"").replace(/[-\s]+/g," ").trim().split(" ").map(uv)).join(" ");
const byUa=new Map(),byKey=new Map();
for(const w of W){for(const u of getUa(w)){const k=bare(u);(byUa.get(k)||byUa.set(k,[]).get(k)).push(w);}
 const k=getEn(w)[0].toLowerCase().replace(/^to /,"");(byKey.get(k)||byKey.set(k,[]).get(k)).push(w);}
const byEnN=new Map();for(const w of W)for(const e of getEn(w).concat(w.enAlt||[])){const k=nEn(e);(byEnN.get(k)||byEnN.set(k,[]).get(k)).push(w);}
const res={ua:{ok:0,soft:[],bad:[],miss:0},en:{ok:0,soft:[],bad:[],miss:0}};
const id=w=>getEn(w)[0]+" = "+getUa(w).join(" / ");
for(const w of W){
 // UA→EN: промпт кожен ua-глос
 for(const u of getUa(w)){const P=bare(u),g=G["uk|"+P];if(!g){res.ua.miss++;continue;}
  const acc=new Set((w.enAlt||[]).map(nEn));for(const x of byUa.get(P)||[])getEn(x).forEach(e=>acc.add(nEn(e)));
  const m=nEn(g.main),alts=g.bd.flatMap(p=>p[1]).map(nEn);
  if(acc.has(m)){res.ua.ok++;continue;}
  const other=(byEnN.get(m)||[]).filter(x=>!(byUa.get(P)||[]).includes(x)).map(x=>getEn(x)[0]+"="+getUa(x)[0]);
  const r={k:"U|"+getEn(w)[0]+"|"+getUa(w)[0]+"|"+P,c:getEn(w)[0]+"|"+getUa(w)[0],ea:(w.enAlt||[]).join(","),card:id(w),prompt:P,google:g.main,galts:alts.slice(0,6),other:other.slice(0,3)};
  (alts.some(a=>acc.has(a))?res.ua.soft:res.ua.bad).push(r);}
 // EN→UA
 const E=getEn(w)[0],g=G["en|"+E];if(!g){res.en.miss++;continue;}
 const k=E.toLowerCase().replace(/^to /,"");let sib=(byKey.get(k)||[]).concat(byKey.get("to "+k)||[]);if(!sib.includes(w))sib.push(w);
 const acc=new Set();for(const x of sib)getUa(x).concat(x.uaAlt||[]).forEach(u=>acc.add(nUa(u)));
 const m=nUa(g.main),alts=g.bd.flatMap(p=>p[1]).map(nUa);
 if(acc.has(m)){res.en.ok++;continue;}
 const r={k:"E|"+getEn(w)[0]+"|"+getUa(w)[0],c:getEn(w)[0]+"|"+getUa(w)[0],en:E,card:id(w)+(w.uaAlt?" | alt: "+w.uaAlt.join(", "):""),google:g.main,galts:alts.slice(0,6)};
 (alts.some(a=>acc.has(a))?res.en.soft:res.en.bad).push(r);
}
for(const k of["ua","en"])console.log(k,"ok",res[k].ok,"soft",res[k].soft.length,"bad",res[k].bad.length,"miss",res[k].miss);
fs.writeFileSync(__dirname+"/cmp.json",JSON.stringify(res,null,0));
