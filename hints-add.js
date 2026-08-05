#!/usr/bin/env node
// hints-add.js — вставка уточнень відтінку значення в блок HINTS у index.html.
//
// Навіщо: один український глос часто має кілька англійських відповідників
// («складний» = hard / difficult / complex / …). HINTS показує в дужках, ЧИМ вони
// різняться — у рядку правильної відповіді, ПІСЛЯ відповіді користувача.
//
// Використання:
//   node hints-add.js hints-batch.json
//     hints-batch.json = {"difficult":"розумово важкий","complex":"із багатьох частин"}
//
// Ключ = wordKey (перша форма `en`, з «to » для дієслів — точно як у картці).
// Уже наявні ключі НЕ перезаписуються без --force; порядок тримається сталим
// (нові дописуються в кінець блоку, згруповані за партіями).

const fs = require("fs");
const P = require("path").join(__dirname, "index.html");
const force = process.argv.includes("--force");
const batch = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

const html = fs.readFileSync(P, "utf8");
const start = html.indexOf("const HINTS = {");
if (start === -1) { console.error("не знайшов блок HINTS"); process.exit(1); }
const end = html.indexOf("\n};", start);
const block = html.slice(start, end);

// ключі, що вже є (перевіряємо на дублі)
const have = new Set([...block.matchAll(/^\s*"([^"]+)":/gm)].map((m) => m[1]));

// звірка з WORDS: ключ має існувати як wordKey, інакше підказка ніколи не покажеться
const L = html.split("\n");
const s = L.findIndex((x) => /^const WORDS = \[$/.test(x));
let e = s; while (!/^\];$/.test(L[e])) e++;
const W = new Function(L.slice(s, e + 1).join("\n") + "\nreturn WORDS;")();
const keys = new Set(W.map((w) => (Array.isArray(w.en) ? w.en[0] : w.en)));

const lines = [], skipped = [], unknown = [];
for (const [k, v] of Object.entries(batch)) {
  if (!keys.has(k)) { unknown.push(k); continue; }
  if (have.has(k) && !force) { skipped.push(k); continue; }
  lines.push('  ' + JSON.stringify(k) + ': ' + JSON.stringify(v) + ',');
}
if (unknown.length) {
  console.error("❌ немає таких карток у WORDS: " + unknown.join(", "));
  process.exit(1);
}

const insert = block.replace(/,?\s*$/, "") + (block.trim().endsWith("{") ? "\n" : ",\n") + lines.join("\n");
fs.writeFileSync(P, html.slice(0, start) + insert + html.slice(end));
console.log("додано підказок: " + lines.length + (skipped.length ? " | вже були: " + skipped.join(", ") : ""));
