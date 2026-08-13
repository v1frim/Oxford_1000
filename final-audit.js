#!/usr/bin/env node
// final-audit.js <raw.json> — фінальний аудит покриття тематичного xlsx:
// кожна позиція має бути в WORDS/enAlt, у EXPRESSIONS або у списку SKIP (свідомі пропуски).
// SKIP усередині файлу — список прозорих композитів і абревіатур, відкинутих за правилом handoff.
// Фінальний аудит: кожна позиція xlsx має бути в WORDS/enAlt, у EXPRESSIONS або у свідомих пропусках.
const fs=require("fs"),R=__dirname+"/";
const L=fs.readFileSync(R+"dict.js","utf8").split("\n");
function sl(a,b,n){const s=L.findIndex(x=>a.test(x));for(let i=s+1;i<L.length;i++)if(b.test(L[i]))return L.slice(s,i+1).join("\n");throw Error(n)}
const W=new Function(sl(/^const WORDS = \[$/,/^\];$/,"W")+"\nreturn WORDS;")();
const E=new Function(sl(/^const EXPRESSIONS = \[$/,/^\];$/,"E")+"\nreturn EXPRESSIONS;")();
const norm=s=>String(s).toLowerCase().replace(/[‘’]/g,"'").replace(/^to\s+/,"").replace(/\s+/g," ").trim();
const arr=x=>Array.isArray(x)?x:[x];
const have=new Set(); W.forEach(w=>{arr(w.en).forEach(e=>have.add(norm(e)));(w.enAlt||[]).forEach(e=>have.add(norm(e)))});
const expr=new Set(E.map(e=>norm(e.en)));
const SKIP=new Set(["Could I have a receipt?", "administrative appeal process", "date of birth", "document number", "fill out a form", "formal administrative complaint", "full name", "means", "notary", "official document", "place of birth", "queue", "to apply for a visa", "to call the police", "to collect a document", "to file a tax return", "to file for divorce", "to get married", "to give evidence / testify", "to give notice", "to make a will", "to meet a deadline", "to report a crime", "to submit an application", "to wait in line / queue"].map(norm));
const raw=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
let ok=0,miss=[];
for(const r of raw){
  const vs=r.en.split(/\s*\/\s*/).map(s=>norm(s)).filter(Boolean);
  if(vs.some(v=>have.has(v)||expr.has(v)||SKIP.has(v))) ok++; else miss.push(r.sect+" | "+r.en);
}
console.log("ПОЗИЦІЙ",raw.length,"| покрито",ok,"| НЕ покрито",miss.length);
miss.forEach(m=>console.log("  ❌",m));
