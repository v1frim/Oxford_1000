#!/usr/bin/env node
// expr-add.js — вставка партії виразів у блок EXPRESSIONS всередині index.html.
//
// Навіщо: нова лексика розподіляється між ДВОМА тренажерами (правило сесії 37):
// окремі слова й назви-предмети → WORDS (add-batch.js), а ідіоми, сталі звороти
// й колокації «дієслово + об'єкт» → EXPRESSIONS («Вирази і сленг», флеш-картки).
//
// Використання:
//   node expr-add.js expr.json
//     expr.json = [{"en":"to apply the brakes","ua":"натиснути на гальма",
//                   "note":"загальмувати педаллю, не різко"}, ...]
//     note — необов'язкове; tag:"slang" — для сленгу (за патерном сесії 41).
//
// Дублі за полем `en` пропускаються. ⚠️ ПІСЛЯ вставки — ./verify.sh.

const fs = require("fs");
const P = require("path").join(__dirname, "index.html");
const D = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const q = s => JSON.stringify(s);

let L = fs.readFileSync(P, "utf8").split("\n");
const s = L.findIndex(x => /^const EXPRESSIONS = \[$/.test(x));
if (s < 0) throw Error("не знайшов блок EXPRESSIONS");
let e = -1;
for (let i = s + 1; i < L.length; i++) if (/^\];$/.test(L[i])) { e = i; break; }
if (e < 0) throw Error("не знайшов кінець EXPRESSIONS");

const have = new Set(L.slice(s, e).join("\n").match(/\{en:"([^"]+)"/g)?.map(m => m.slice(5, -1).toLowerCase()) || []);
const fresh = D.filter(d => {
  if (have.has(String(d.en).toLowerCase())) { console.log("вже є:", d.en); return false; }
  return true;
});
if (!fresh.length) { console.log("нових виразів немає"); process.exit(0); }

const lines = fresh.map(d => "  {en:" + q(d.en) + ", ua:" + q(d.ua) +
  (d.note ? ", note:" + q(d.note) : "") + (d.tag ? ", tag:" + q(d.tag) : "") + "},");
L[e - 1] = L[e - 1].replace(/([}"])\s*$/, "$1,");
lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, "");
L.splice(e, 0, ...lines);
fs.writeFileSync(P, L.join("\n"));
console.log("вставлено виразів:", fresh.length);
