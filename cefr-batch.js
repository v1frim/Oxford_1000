#!/usr/bin/env node
// cefr-batch.js batch.json [batch2.json ...] — розкидає рівні CEFR прямо з партії.
// Кожна картка партії має поле "cefr":"A2|B1|B2|C1". Скрипт групує їх і кличе cefr-add.js.
// Заведено в сесії 49: прибирає крок «показати список без рівня й скласти 4 файли руками»,
// а заразом робить пастку «порожній B2» неможливою — рівень пишеться разом із карткою.
const fs=require("fs"),cp=require("child_process"),os=require("os"),path=require("path");
const groups={};
for(const f of process.argv.slice(2))
  for(const d of JSON.parse(fs.readFileSync(f,"utf8"))){
    if(!d.cefr) throw Error("нема cefr: "+d.en);
    (groups[d.cefr]=groups[d.cefr]||[]).push({en:d.en});
  }
const order=["A1","A2","B1","B2","C1","C2"];
const counts=order.filter(l=>groups[l]).map(l=>l+" "+groups[l].length);
console.log("розподіл партії:", counts.join(" · "));
if(!groups.B2) console.log("⚠️  B2 ПОРОЖНІЙ — перевір розподіл (пастка сесії 48)");
for(const l of order){
  if(!groups[l]) continue;
  const t=path.join(os.tmpdir(),"cefr-"+l+".json");
  fs.writeFileSync(t,JSON.stringify(groups[l]));
  process.stdout.write(cp.execSync(`node ${__dirname}/cefr-add.js ${t} ${l}`).toString().trim().split("\n").pop()+"\n");
}
