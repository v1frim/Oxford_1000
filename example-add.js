#!/usr/bin/env node
// example-add.js — дописує ПРИКЛАДИ під конкретний глос багатозначної картки.
//
// Навіщо: `lookupExample` пробує `table[en + ":" + ua]` ПЕРЕД голим `en`, тож картка
// з кількома глосами може мати свій приклад на кожен сенс. Без цього на промпт
// «декорації» показувалось речення про гори (картка `scenery`), а на «підрозділ» —
// про секцію магазину (`section`).
//
// Використання:
//   node example-add.js batch.json
//     batch.json = { "scenery:декорації": { "ex": "...", "exUa": "..." }, ... }
//
// ⚠️ КЛЮЧ МУСИТЬ ЗБІГАТИСЯ З ГЛОСОМ ЗНАК У ЗНАК (включно з апострофом і регістром),
// інакше гра мовчки візьме голий `en` — помилки не буде, приклад просто не спрацює.
// ⚠️ ПІСЛЯ вставки ОБОВ'ЯЗКОВО ./verify.sh: покриття перевіряє, що всі слова НОВОГО
// речення мають hover-переклад, а стенд — що лічильник прикладів виріс.

const fs = require("fs");
const P = require("path").join(__dirname, "dict.js");
const batch = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const q = s => JSON.stringify(s);

let src = fs.readFileSync(P, "utf8");
const count = (block, re) => (block.match(re) || []).length;

function insert(name, field) {
  const head = "const " + name + " = {";
  const start = src.indexOf(head);
  if (start === -1) throw Error("не знайшов блок " + name);
  const end = src.indexOf("\n};", start);
  const before = count(src.slice(start, end), /^\s*"/gm);
  const lines = [];
  for (const [key, v] of Object.entries(batch)) {
    if (src.slice(start, end).includes('"' + key + '":')) { console.log("вже є:", name, key); continue; }
    lines.push("  " + q(key) + ":" + q(v[field]) + ",");
  }
  if (!lines.length) return 0;
  // ⚠️ ВСТАВЛЯЄМО НА ПОЧАТОК блоку, а не в кінець: тоді кожен новий рядок несе свою кому,
  // і чіпати кому попереднього ОСТАННЬОГО запису (якої там немає) не доводиться.
  const at = start + head.length;
  src = src.slice(0, at) + "\n" + lines.join("\n") + src.slice(at);
  const end2 = src.indexOf("\n};", start);
  const after = count(src.slice(start, end2), /^\s*"/gm);
  if (after !== before + lines.length) throw Error(name + ": ключів " + before + " → " + after);
  return lines.length;
}

const n1 = insert("EXAMPLES", "ex");
const n2 = insert("EXAMPLES_UA", "exUa");
if (n1 !== n2) throw Error("EXAMPLES " + n1 + " ≠ EXAMPLES_UA " + n2);
fs.writeFileSync(P, src);
console.log("дописано прикладів:", n1);
