// Пошук «прозорих» композитів: en з кількох слів, де КОЖЕН складник є окремою карткою,
// а глос фрази = склейка глосів складників (за коренями).
const fs=require("fs"),R=__dirname+"/";
const L=fs.readFileSync(R+"dict.js","utf8").split("\n");
function sl(a,b,n){const s=L.findIndex(x=>a.test(x));for(let i=s+1;i<L.length;i++)if(b.test(L[i]))return L.slice(s,i+1).join("\n");throw Error(n)}
const W=new Function(sl(/^const WORDS = \[$/,/^\];$/,"W")+"\nreturn WORDS;")();
const arr=x=>Array.isArray(x)?x:[x];
const norm=s=>String(s).toLowerCase().trim();
const byEn=new Map();
W.forEach(w=>{arr(w.en).forEach(e=>{const k=norm(e).replace(/^to /,"");if(!byEn.has(k))byEn.set(k,w)})});
// корінь укр. слова: перші 5 літер (або все слово, якщо коротше)
const root=s=>{s=s.toLowerCase().replace(/[^а-яїієґёa-z']/g," ").trim().split(/\s+/)[0]||"";return s.length>5?s.slice(0,5):s};
const STOP=new Set(["a","an","the","of","to","and","in","on","for","with","at","by"]);
const out=[];
for(const w of W){
  const en=norm(arr(w.en)[0]).replace(/^to /,"");
  const parts=en.split(/[\s-]+/).filter(p=>p&&!STOP.has(p));
  if(parts.length<2||parts.length>3) continue;
  const glos=arr(w.ua)[0].toLowerCase();
  const comp=[];
  let allKnown=true;
  for(const p of parts){
    const c=byEn.get(p);
    if(!c){allKnown=false;break}
    comp.push(arr(c.ua)[0]);
  }
  if(!allKnown) continue;
  // чи всі корені складників присутні у глосі фрази
  const hit=comp.every(g=>{const r=root(g);return r.length>=3&&glos.includes(r)});
  if(hit) out.push({en:arr(w.en)[0],ua:arr(w.ua)[0],comp});
}
console.log("КАНДИДАТІВ:",out.length,"із",W.length,"карток\n");
out.forEach(o=>console.log("  "+o.en.padEnd(28)+"= "+o.ua.padEnd(34)+"  ← "+o.comp.join(" + ")));
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));
