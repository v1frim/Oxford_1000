#!/usr/bin/env node
// uaalt-add.js — дописує додаткові українські відповіді в `uaAlt` карток `dict.js`.
//
// Навіщо: `uaAlt` — прийнятні відповіді, які НЕ показуються як промпт. Діють ЛИШЕ
// в напрямку US→UA (`getUa` їх не повертає, тож крос-логіка UA→US не зачеплена).
// Доти партії дописувались руками; цей скрипт робить те саме безпечно.
//
// Використання:
//   node uaalt-add.js batch.json
//     batch.json = {"bath mat":["килим для ванни"], "to log in":["увійти в обліковий запис"]}
//     --force  — не падати на картках, яких немає (пропускати з попередженням)
//
// ⚠️ ПРАВИТЬ ТІЛЬКИ В МЕЖАХ БЛОКУ `const WORDS = [` … `\n];` — урок сесії 50, де
// заміна по всьому файлу чотири рази нищила ключі в TRANS/EXAMPLES. Ключі рахуються
// ДО і ПІСЛЯ, розбіжність = аварійний вихід без запису.
//
// ⚠️ Критерій відбору варіанта — не «чи це правильне українське слово», а
// «чи користувач це НАБЕРЕ» (правило сесії 40): uaAlt показується в панелі
// правильної відповіді, тож книжне/рідковживане там лише заважає.

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

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const q = (s) => JSON.stringify(s);

let added = 0, skipped = [], missing = [];
for (const [en, variants] of Object.entries(batch)) {
  const re = new RegExp('\\{en:"' + esc(en) + '",(?:(?!\\{en:)[^}])*\\}');
  const m = block.match(re);
  if (!m) { missing.push(en); continue; }
  const card = m[0];

  // основний глос картки — щоб не дописати тавтологію
  const uaM = card.match(/,ua:(\[[^\]]*\]|"(?:[^"\\]|\\.)*")/);
  const mainRaw = uaM ? uaM[1] : '""';
  const main = JSON.parse(mainRaw.startsWith("[") ? mainRaw : "[" + mainRaw + "]");

  const altM = card.match(/,uaAlt:\[([^\]]*)\]/);
  const cur = altM && altM[1].trim() ? JSON.parse("[" + altM[1] + "]") : [];

  const fresh = [];
  for (const v of variants) {
    const t = v.trim();
    if (main.some((x) => x.trim().toLowerCase() === t.toLowerCase())) { skipped.push(en + " ← «" + t + "» (= основний глос)"); continue; }
    if (cur.some((x) => x.trim().toLowerCase() === t.toLowerCase())) { skipped.push(en + " ← «" + t + "» (дубль)"); continue; }
    if (/[()]/.test(t)) { skipped.push(en + " ← «" + t + "» (дужки в uaAlt — мертвий запис, його неможливо ввести)"); continue; }
    cur.push(t); fresh.push(t);
  }
  if (!fresh.length) continue;

  const newAlt = ",uaAlt:[" + cur.map(q).join(",") + "]";
  const patched = altM
    ? card.replace(/,uaAlt:\[[^\]]*\]/, newAlt)
    : card.replace(/\}$/, newAlt + "}");
  block = block.replace(card, patched);
  added += fresh.length;
}

if (missing.length) {
  console.error("❌ немає таких карток у WORDS: " + missing.join(", "));
  if (!force) process.exit(1);
}
const after = (block.match(/\{en:"/g) || []).length;
if (before !== after) { console.error("❌ кількість карток змінилась " + before + " → " + after + " — НІЧОГО не записано"); process.exit(1); }

fs.writeFileSync(P, src.slice(0, start) + block + src.slice(end));
console.log("дописано варіантів: " + added + " | карток у WORDS: " + after);
if (skipped.length) console.log("пропущено:\n  " + skipped.join("\n  "));
