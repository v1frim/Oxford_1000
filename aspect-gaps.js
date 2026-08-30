#!/usr/bin/env node
// aspect-gaps.js — ДОРАДЧИЙ звіт: дієслівні картки, де в `ua`+`uaAlt` схоже
// що немає пари видів (доконаний ↔ недоконаний).
//
// Навіщо: англійська виду не має, тож `to gain weight` — це і «набирати», і
// «набрати». Якщо картка приймає лише один вид, гравець отримує ✗ за
// ПРАВИЛЬНУ відповідь. Сесія 54: так закрито 544 варіанти на 933 картках.
//
// Використання:  node aspect-gaps.js [out.json]
//
// ⚠️ НЕ входить у verify.sh і НЕ є критерієм коміту: обидві евристики шумлять
// (укр. вид без словника точно не визначити). Список — привід ПОДИВИТИСЬ,
// а не автоматично правити. Пари пишемо руками через uaalt-add.js.
//   • евристика A (вид за префіксом/суфіксом): ловить кросКореневі пари
//     (пробачати/простити), але плутає вторинні недоконані (відчиняти).
//   • евристика B (спільний корінь після зняття префікса): навпаки.
//   Друкуємо перетин — там, де обидві кажуть «пари немає».

const fs = require("fs");
const s = fs.readFileSync(require("path").join(__dirname, "dict.js"), "utf8");
const a = s.indexOf("const WORDS = ["), b = s.indexOf("\n];", a);
const recs = [...s.slice(a, b).matchAll(/\{en:"([^"]+)",ua:(\[[^\]]*\]|"[^"]*")(,uaAlt:\[([^\]]*)\])?/g)]
  .map((m) => ({ en: m[1], ua: JSON.parse(m[2].startsWith("[") ? m[2] : "[" + m[2] + "]"),
                 alt: m[4] ? JSON.parse("[" + m[4] + "]") : [] }));

const PFX = ["попри","пере","роз","при","під","над","від","про","за","по","ви","на","до","об","з","с","у","в","о"];
const isVerb = (p) => /(ти|тися|тись)$/.test(p.split(" ")[0]);

function aspect(p) {                                   // евристика A
  const w = p.split(" ")[0];
  if (/(увати|ювати|овувати)(ся|сь)?$/.test(w)) return "impf";   // вторинний недок.
  return PFX.find((q) => w.startsWith(q) && w.length - q.length >= 4) ? "pf" : "impf";
}
const norm = (p) => {                                  // евристика B
  let w = p.split(" ")[0].replace(/(ся|сь)$/, "");
  const x = PFX.find((q) => w.startsWith(q) && w.length - q.length >= 4);
  return x ? w.slice(x.length) : w;
};
const common = (x, y) => { let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i++; return i; };

const verbs = recs.filter((r) => /^to /.test(r.en) && r.ua.some(isVerb));
const rows = [];
for (const v of verbs) {
  const forms = [...new Set([...v.ua, ...v.alt].filter(isVerb))];
  const byAspect = new Set(forms.map(aspect)).size >= 2;
  let byStem = false;
  for (let i = 0; i < forms.length && !byStem; i++)
    for (let j = i + 1; j < forms.length; j++) {
      const A = norm(forms[i]), B = norm(forms[j]);
      if (A === B || common(A, B) >= 4) { byStem = true; break; }
    }
  if (!byAspect && !byStem) rows.push({ en: v.en, ua: v.ua.join(" / "), alt: v.alt.filter(isVerb).join(", ") });
}
console.log(`дієслівних карток: ${verbs.length} | без пари видів (обидві евристики): ${rows.length}`);
if (process.argv[2]) { fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 1)); console.log("→", process.argv[2]); }
else console.log(rows.map((r) => r.en + " = " + r.ua).join(" | "));
