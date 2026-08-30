#!/usr/bin/env node
// enalt-add.js — дописує англійські синоніми-відповіді в `enAlt` карток `dict.js`.
//
// Навіщо: `enAlt` — англійські слова, які зараховуються в напрямку UA→EN, але НЕ
// показуються промптом. Дзеркало `uaalt-add.js` для другого напрямку (сесія 54).
//
// Використання:
//   node enalt-add.js batch.json
//     batch.json = {"correct":["correctly"], "trip":["journey"]}
//     --force  — не падати на картках, яких немає (пропускати з попередженням)
//
// ⚠️ ПРАВИТЬ ТІЛЬКИ В МЕЖАХ БЛОКУ `const WORDS = [` … `\n];` (урок сесії 50).
// Ключі рахуються ДО і ПІСЛЯ, розбіжність = аварійний вихід без запису.
//
// ⚠️ Критерій відбору (межа сесії 30, перевіряється в test-homograph.js): додаємо
// ЛИШЕ те, що справді взаємозамінне. `uaAlt` іншої картки сам по собі НЕ підстава:
// у `gradual.uaAlt` є «повільний», але gradual ≠ slow. Див. prompt-clash.js.

const fs = require("fs");
const P = require("path").join(__dirname, "dict.js");
const force = process.argv.includes("--force");
const batch = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

const src = fs.readFileSync(P, "utf8");
const start = src.indexOf("const WORDS = [");
if (start === -1) { console.error("не знайшов блок WORDS"); process.exit(1); }
const end = src.indexOf("\n];", start);
let block = src.slice(start, end);
const before = (block.match(/\{en:"/g) || []).length;

let added = 0; const skipped = [];
for (const [en, alts] of Object.entries(batch)) {
  const esc = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp('\\{en:"' + esc + '"((?:(?!\\{en:)[^}])*)\\}');
  const m = block.match(re);
  if (!m) { if (force) { skipped.push(en + " (немає картки)"); continue; }
            console.error("немає картки:", en); process.exit(1); }
  let body = m[1];
  const cur = /,enAlt:\[([^\]]*)\]/.exec(body);
  const have = cur ? JSON.parse("[" + cur[1] + "]") : [];
  const add = alts.filter((x) => !have.includes(x));
  if (!add.length) { skipped.push(en + " ← " + alts.join(", ") + " (дубль)"); continue; }
  const list = have.concat(add).map((x) => JSON.stringify(x)).join(",");
  body = cur ? body.replace(/,enAlt:\[[^\]]*\]/, ",enAlt:[" + list + "]") : body + ",enAlt:[" + list + "]";
  block = block.replace(re, '{en:"' + en + '"' + body.replace(/\$/g, "$$$$") + "}");
  added += add.length;
}
const after = (block.match(/\{en:"/g) || []).length;
if (before !== after) { console.error("СТОП: карток було", before, "стало", after); process.exit(1); }
fs.writeFileSync(P, src.slice(0, start) + block + src.slice(end));
console.log("дописано синонімів:", added, "| карток у WORDS:", after);
if (skipped.length) console.log("пропущено:\n  " + skipped.join("\n  "));
