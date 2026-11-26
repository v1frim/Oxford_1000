#!/usr/bin/env node
// add-batch.js — вставка партії нових слів у dict.js одним проходом.
//
// Додає записи в УСІ чотири блоки (WORDS + TRANS + EXAMPLES + EXAMPLES_UA)
// і, за потреби, дописує enAlt до вже наявних карток (брит./амер. варіанти).
//
// Використання:
//   node add-batch.js batch.json "Oxford-добір, партія N: B2 (сесія 42)" '[["truck","lorry"]]'
//     batch.json = [{"en","ua":[..],"uaAlt":[..],"enAlt":[..],"ipa","ex","exUa","def","syn":[..],"ant":[..]}, ...]
//     def — ОБОВ'ЯЗКОВЕ (сесія 77, вартовий check-defs.js): просте англ. тлумачення БЕЗ самого слова й кореня;
//     syn / ant — необов'язкові, лише справжні однослівні (1–5). Ключ у DEFS/SYNS/ANTS — en картки.
//     3-й аргумент — коментар-роздільник у WORDS; 4-й (опційно) — пари [база, новий enAlt].
//
// ⚠️ ПІСЛЯ вставки ОБОВ'ЯЗКОВО ./verify.sh (coverage + синтаксис + стенд).

const fs=require("fs"),P=require("path").join(__dirname,"dict.js");   // дані живуть у dict.js (сесія 48)
const D=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
let L=fs.readFileSync(P,"utf8").split("\n");
const q=s=>JSON.stringify(s);            // безпечне екранування
const uaField=a=>a.length===1?q(a[0]):"["+a.map(q).join(",")+"]";
function endOf(startRe,endRe){const s=L.findIndex(x=>startRe.test(x));
 for(let i=s+1;i<L.length;i++) if(endRe.test(L[i])) return i; throw Error("no end "+startRe);}
function insert(startRe,endRe,lines){const e=endOf(startRe,endRe);
 L[e-1]=L[e-1].replace(/([}"\]])\s*$/,"$1,");   // ] — кінець запису SYNS/ANTS (сесія 77)            // кома до попереднього останнього запису
 L.splice(e,0,...lines);}

const words=D.map(d=>"  {en:"+q(d.en)+",ua:"+uaField(d.ua)+
 (d.uaAlt?",uaAlt:["+d.uaAlt.map(q).join(",")+"]":"")+
 (d.enAlt?",enAlt:["+d.enAlt.map(q).join(",")+"]":"")+"},").map((s,i,a)=>i===a.length-1?s.replace(/,$/,""):s);
const mk=f=>D.map(d=>"  "+q(d.en)+":"+q(d[f])+",").map((s,i,a)=>i===a.length-1?s.replace(/,$/,""):s);

insert(/^const WORDS = \[$/,/^\];$/,["  // ── "+process.argv[3]+" ──",...words]);
insert(/^const TRANS = \{$/,/^\};$/,mk("ipa"));
insert(/^const EXAMPLES = \{$/,/^\};$/,mk("ex"));
insert(/^const EXAMPLES_UA = \{$/,/^\};$/,mk("exUa"));
// EN→EN (сесія 77): DEFS / SYNS / ANTS — лише для записів, де поле є
const has=(B,en)=>{const s=L.findIndex(x=>x==="const "+B+" = {");   // ключ уже є (пара з тим самим en) — не дублюємо
 for(let i=s+1;i<L.length&&L[i]!=="};";i++) if(L[i].startsWith("  "+q(en)+":")) return true; return false;};
const opt=(f,v,B)=>{const a=D.filter(d=>d[f]&&(!Array.isArray(d[f])||d[f].length)&&!has(B,d.en));
 return a.map(d=>"  "+q(d.en)+":"+v(d[f])+",").map((s,i,x)=>i===x.length-1?s.replace(/,$/,""):s);};
const arr=a=>"["+a.map(q).join(",")+"]";
[["DEFS","def",q],["SYNS","syn",arr],["ANTS","ant",arr]].forEach(([B,f,v])=>{const ls=opt(f,v,B);
 if(ls.length) insert(new RegExp("^const "+B+" = \\{$"),/^\};$/,ls);});
const noDef=D.filter(d=>!d.def).map(d=>d.en);
if(noDef.length) console.log("⚠️ без def (вартовий check-defs.js не пропустить):",noDef.join(", "));

// enAlt-доповнення до наявних карток (брит./амер. варіанти й синоніми)
const ALT=JSON.parse(process.argv[4]||"[]");
let txt=L.join("\n");
for(const [base,alt] of ALT){
  // ⚠️ enAlt може стояти БУДЬ-ДЕ в картці (часто перед uaAlt). До сесії 65 регекс бачив його лише в кінці й
  // дописував ДРУГИЙ ключ enAlt — у JS-літералі виграє останній, тож старі варіанти мовчки губились.
  const re=new RegExp('\\{en:"'+base.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+'",[^}]*\\}');
  const m=txt.match(re);
  if(!m){console.log("⚠️ не знайшов картку",base);continue;}
  const card=m[0], ea=card.match(/,enAlt:\[([^\]]*)\]/);
  if(ea&&ea[1].includes('"'+alt+'"')){console.log("вже є",base,"←",alt);continue;}
  const next=ea?card.replace(ea[0],",enAlt:["+ea[1]+',"'+alt+'"]'):card.replace(/\}$/,',enAlt:["'+alt+'"]}');
  txt=txt.replace(card,()=>next);
  console.log("enAlt:",base,"←",alt);
}
fs.writeFileSync(P,txt);
console.log("вставлено карток:",D.length);
