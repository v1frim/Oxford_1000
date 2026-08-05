#!/usr/bin/env node
// add-batch.js — вставка партії нових слів у index.html одним проходом.
//
// Додає записи в УСІ чотири блоки (WORDS + TRANS + EXAMPLES + EXAMPLES_UA)
// і, за потреби, дописує enAlt до вже наявних карток (брит./амер. варіанти).
//
// Використання:
//   node add-batch.js batch.json "Oxford-добір, партія N: B2 (сесія 42)" '[["truck","lorry"]]'
//     batch.json = [{"en","ua":[..],"uaAlt":[..],"enAlt":[..],"ipa","ex","exUa"}, ...]
//     3-й аргумент — коментар-роздільник у WORDS; 4-й (опційно) — пари [база, новий enAlt].
//
// ⚠️ ПІСЛЯ вставки ОБОВ'ЯЗКОВО ./verify.sh (coverage + синтаксис + стенд).

const fs=require("fs"),P=require("path").join(__dirname,"index.html");
const D=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
let L=fs.readFileSync(P,"utf8").split("\n");
const q=s=>JSON.stringify(s);            // безпечне екранування
const uaField=a=>a.length===1?q(a[0]):"["+a.map(q).join(",")+"]";
function endOf(startRe,endRe){const s=L.findIndex(x=>startRe.test(x));
 for(let i=s+1;i<L.length;i++) if(endRe.test(L[i])) return i; throw Error("no end "+startRe);}
function insert(startRe,endRe,lines){const e=endOf(startRe,endRe);
 L[e-1]=L[e-1].replace(/([}"])\s*$/,"$1,");            // кома до попереднього останнього запису
 L.splice(e,0,...lines);}

const words=D.map(d=>"  {en:"+q(d.en)+",ua:"+uaField(d.ua)+
 (d.uaAlt?",uaAlt:["+d.uaAlt.map(q).join(",")+"]":"")+
 (d.enAlt?",enAlt:["+d.enAlt.map(q).join(",")+"]":"")+"},").map((s,i,a)=>i===a.length-1?s.replace(/,$/,""):s);
const mk=f=>D.map(d=>"  "+q(d.en)+":"+q(d[f])+",").map((s,i,a)=>i===a.length-1?s.replace(/,$/,""):s);

insert(/^const WORDS = \[$/,/^\];$/,["  // ── "+process.argv[3]+" ──",...words]);
insert(/^const TRANS = \{$/,/^\};$/,mk("ipa"));
insert(/^const EXAMPLES = \{$/,/^\};$/,mk("ex"));
insert(/^const EXAMPLES_UA = \{$/,/^\};$/,mk("exUa"));

// enAlt-доповнення до наявних карток (брит./амер. варіанти й синоніми)
const ALT=JSON.parse(process.argv[4]||"[]");
let txt=L.join("\n");
for(const [base,alt] of ALT){
  const re=new RegExp('(\\{en:"'+base.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+'",[^}]*?)(,enAlt:\\[([^\\]]*)\\])?\\}');
  const m=txt.match(re);
  if(!m){console.log("⚠️ не знайшов картку",base);continue;}
  if(m[3]&&m[3].includes('"'+alt+'"')){console.log("вже є",base,"←",alt);continue;}
  const cur=m[3]?m[3]+",":"";
  txt=txt.replace(re,m[1]+",enAlt:["+cur+'"'+alt+'"]}');
  console.log("enAlt:",base,"←",alt);
}
fs.writeFileSync(P,txt);
console.log("вставлено карток:",D.length);
