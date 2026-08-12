#!/usr/bin/env node
// gloss-check.js — перевірка кандидатів перед вставкою у словник.
//
// Для кожного кандидата показує: чи слово ВЖЕ є в WORDS/enAlt, чи має лише
// hover (m.set), і чи вільний запропонований український глос:
//   ✅ вільний | ⛔осн:X — глос уже ОСНОВНИЙ у слові X | ~alt:X — лежить у uaAlt X
//
// ⛔ не завжди дефект: спільний основний глос — НОРМА для справжніх синонімів
// (крос-логіка ua-en приймає обидва). Розводити треба лише НЕсинонімів
// («позичений глос», див. handoff → «МЕТОДИКА СКАНУ»). ~alt ігнорується:
// uaAlt у ua-en не діє.
//
// Використання: node gloss-check.js candidates.json
//   candidates.json = [{"en":"game","ua":["гра"],"uaAlt":["забава"]}, ...]

const fs=require("fs");
const LINES=(fs.readFileSync(require("path").join(__dirname,"dict.js"),"utf8")+"\n"+fs.readFileSync(require("path").join(__dirname,"index.html"),"utf8")).split("\n");
function slice(sRe,eRe,l){const s=LINES.findIndex(x=>sRe.test(x));for(let i=s+1;i<LINES.length;i++)if(eRe.test(LINES[i]))return LINES.slice(s,i+1).join("\n");throw Error(l);}
const W=new Function(slice(/^const WORDS = \[$/,/^\];$/,"W")+"\nreturn WORDS;")();
const msetSrc=slice(/^const EN_TO_UA = \(\(\) => \{$/,/^\}\)\(\);$/,"E");
const mset=new Set([...msetSrc.matchAll(/m\.set\("([^"]+)"/g)].map(m=>m[1].toLowerCase()));
const norm=s=>String(s).trim().toLowerCase(),bare=s=>norm(s).replace(/^to /,"");
const arr=x=>Array.isArray(x)?x:[x];
const enSet=new Set(),uaMain=new Map(),uaAll=new Map();
W.forEach(w=>{arr(w.en).forEach(e=>{enSet.add(norm(e));enSet.add(bare(e));});
 (w.enAlt||[]).forEach(e=>{enSet.add(norm(e));enSet.add(bare(e));});
 arr(w.ua).forEach(u=>{const k=norm(u);if(!uaMain.has(k))uaMain.set(k,[]);uaMain.get(k).push(arr(w.en)[0]);});
 [...arr(w.ua),...(w.uaAlt||[])].forEach(u=>{const k=norm(u);if(!uaAll.has(k))uaAll.set(k,[]);uaAll.get(k).push(arr(w.en)[0]);});});
const cand=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
for(const c of cand){
  const en=norm(c.en), have=enSet.has(en)||enSet.has(bare(en)), hov=mset.has(bare(en))||mset.has(en);
  const gl=(c.ua||[]).map(u=>{const m=uaMain.get(norm(u)),a=uaAll.get(norm(u));
    return u+(m?" ⛔осн:"+m.join("/"):a?" ~alt:"+a.join("/"):" ✅");}).join(" | ");
  const al=(c.uaAlt||[]).map(u=>{const m=uaMain.get(norm(u));return m?u+" ⛔осн:"+m.join("/"):null;}).filter(Boolean).join(" | ");
  console.log((have?"МАЄМО ":hov?"hover ":"      ")+en.padEnd(16)+gl+(al?"   [uaAlt:"+al+"]":""));
}
