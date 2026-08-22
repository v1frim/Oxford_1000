#!/usr/bin/env node
// cefr-add.js — дописує ключі нових карток у блок CEFR_DATA всередині dict.js.
//
// Навіщо: CEFR_DATA згенеровано один раз (сесія 42, gen-cefr.js), і кожна нова
// партія без цього кроку падає в кошик «без рівня» у грі «🎓 Рівні».
//
// Використання:
//   node cefr-add.js batch.json C2
//     batch.json — та сама партія, що йшла в add-batch.js ([{en,...}])
//     рівень — A1|A2|B1|B2|C1|C2
//
// Ключ = поле `en` картки в нижньому регістрі (з префіксом «to » для дієслів) —
// дзеркало wordKey(w) = getEn(w)[0] у грі. Дублі й уже наявні ключі пропускаються,
// список тримається відсортованим.

const fs = require("fs");
const P = require("path").join(__dirname, "dict.js");   // дані живуть у dict.js (сесія 48)
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const batch = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const level = String(process.argv[3] || "").toUpperCase();
if (!LEVELS.includes(level)) { console.error("рівень має бути одним із " + LEVELS.join("/")); process.exit(1); }

const html = fs.readFileSync(P, "utf8");
// ⚠️ хвіст `,` НЕобов'язковий: C2 — ОСТАННІЙ ключ у CEFR_DATA, тож його рядок
// закінчується просто на `"`. Без `,?` скрипт падав «не знайшов рядок C2» (сесія 52).
const lineRe = new RegExp('^(  ' + level + ': ")([^"]*)(",?)$', "m");
const m = html.match(lineRe);
if (!m) { console.error("не знайшов рядок " + level + " у CEFR_DATA"); process.exit(1); }

// усі рівні разом — щоб не дублювати ключ, який уже має мітку
const all = new Map();
for (const L of LEVELS) {
  const mm = html.match(new RegExp('^(  ' + L + ': ")([^"]*)(",?)$', "m"));
  if (mm) for (const w of mm[2].split("|")) if (w) all.set(w, L);
}

const cur = new Set(m[2].split("|").filter(Boolean));
const added = [], skipped = [];
for (const c of batch) {
  const key = String(c.en).trim().toLowerCase();
  const has = all.get(key);
  if (has) { skipped.push(key + " (вже " + has + ")"); continue; }
  if (cur.has(key)) { skipped.push(key + " (дубль)"); continue; }
  cur.add(key); added.push(key);
}

const sorted = [...cur].sort();
fs.writeFileSync(P, html.replace(lineRe, (s, a, b, c) => a + sorted.join("|") + c));
console.log(level + ": було " + (sorted.length - added.length) + " → стало " + sorted.length + " (+" + added.length + ")");
if (skipped.length) console.log("пропущено: " + skipped.join(", "));
