// remove-card.js "<en>" [...] — акуратно прибирає картку з усіх блоків dict.js
// (WORDS + TRANS + EXAMPLES + EXAMPLES_UA + HINTS + рядок рівня в CEFR_DATA).
const fs=require("fs"),P=require("path").join(__dirname,"dict.js");
let s=fs.readFileSync(P,"utf8");
const esc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
for(const en of process.argv.slice(2)){
  const e=esc(en);
  let n=0;
  // запис у WORDS (може стояти сам на рядку або в рядку з іншими)
  const wre=new RegExp('\\{en:"'+e+'",[^}]*\\},?','g');
  s=s.replace(wre,()=>{n++;return""});
  // ключі в TRANS / EXAMPLES / EXAMPLES_UA / HINTS
  const kre=new RegExp('^\\s*"'+e+'":\\s*"(?:[^"\\\\]|\\\\.)*",?\\n','gm');
  s=s.replace(kre,()=>{n++;return""});
  // рівень у CEFR_DATA (рядки виду A2: "a|b|c")
  const cre=new RegExp('(?<=\\|)'+esc(en.toLowerCase())+'\\|','g');
  s=s.replace(cre,()=>{n++;return""});
  // порожні рядки, що лишились після вирізання запису WORDS
  console.log("  −",en,"(правок:",n+")");
}
s=s.replace(/^[ \t]*\n(?=[ \t]*\{en:)/gm,"");   // прибрати осиротілі порожні рядки перед записами
s=s.replace(/,(\s*[\]\}])/g,"$1");              // висяча кома перед закриттям блоку
fs.writeFileSync(P,s);
