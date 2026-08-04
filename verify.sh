#!/bin/sh
# Передкомітна перевірка словника. ⚠️ БЕЗ пайпів після check-coverage:
# `node check-coverage.js | tail` маскує код виходу (успіх tail'а), через що
# в сесії 41 двічі пройшов коміт із непокритим словом. Тут exit-код вирішує все.
cd /home/user/Oxford_1000 || exit 1
node check-coverage.js > /tmp/_cov.txt 2>&1 || { echo "❌ COVERAGE:"; tail -20 /tmp/_cov.txt; exit 1; }
tail -2 /tmp/_cov.txt
node -e '
const fs=require("fs");const h=fs.readFileSync("index.html","utf8");
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m;
while((m=re.exec(h))){try{new Function(m[1]);}catch(e){console.log("❌ SYNTAX: "+e.message);process.exit(1);}}
console.log("✅ синтаксис");' || exit 1
node /tmp/claude-0/-home-user-Oxford-1000/c2ea01e5-e701-5e1a-b85c-792a086dc719/scratchpad/loadtest.js || exit 1
echo "✅ усе чисто — можна комітити"
