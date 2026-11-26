#!/usr/bin/env node
// check-defs.js — вартовий тлумачень (DEFS) для НОВИХ слів (сесія 77, план «📌 СЕСІЯ 76», п. 13).
//
// Навіщо: Def / Syn / Ant (у меню English only і в поході) беруть лише слова, для яких є дані.
// Слово без тлумачення мовчки ніколи не трапиться в Def. Як і check-cefr.js, порівнює WORDS
// з git HEAD і вимагає DEFS лише для щойно доданих карток — старі без тлумачень не шумлять.
//
// Що перевіряє для нових слів:
//   1. DEFS[en] є (ключ — головне en картки, як у грі: getEn(w)[0]);
//   2. тлумачення НЕ містить самого слова чи його кореня (інакше Def-завдання видає відповідь);
//   3. SYNS / ANTS, якщо є, — непорожні масиви рядків. Вони НЕ обов'язкові.
//
// Використання:
//   node check-defs.js            — вартовий (входить у ./verify.sh)
//   node check-defs.js --stats    — покриття DEFS / SYNS / ANTS по рівнях CEFR + усі «тлумачення з коренем слова»
//
// Свідомо без тлумачення (власна назва тощо) — додай ключ у ALLOW.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ROOT = __dirname, FILE = path.join(ROOT, "dict.js");

const ALLOW = new Set([]);

function load(src) {
  const L = src.split("\n");
  const take = (a, b, name, opt) => {
    const i = L.findIndex(x => a.test(x));
    const j = L.findIndex((x, k) => k > i && b.test(x));
    if (i < 0 || j < 0) { if (opt) return "const " + name + " = {};"; throw new Error("не знайшов блок " + name); }
    return L.slice(i, j + 1).join("\n");
  };
  const src2 = take(/^const WORDS = \[$/, /^\];$/, "WORDS") + "\n" +
    take(/^const CEFR_DATA = \{$/, /^\};$/, "CEFR_DATA") + "\n" +
    // у HEAD до сесії 77 блоків ще немає (жили в index.html) — тоді порожні
    take(/^const DEFS = \{$/, /^\};$/, "DEFS", true) + "\n" +
    take(/^const SYNS = \{$/, /^\};$/, "SYNS", true) + "\n" +
    take(/^const ANTS = \{$/, /^\};$/, "ANTS", true);
  return new Function(src2 + "\nreturn {WORDS, CEFR_DATA, DEFS, SYNS, ANTS};")();
}
const enOf = w => String(Array.isArray(w.en) ? w.en[0] : w.en);
const STOP = /^(to|a|an|the|of|in|on|at|for|with|and|or|up|out|off|down|someone|something|one's|sb|sth)$/i;
// корінь: без кінцевих y/e/s, і в довгих (6+) ще мінус 2 літери: lucky → luck, social → soci (society),
// teacher → teach; throw → throw (НЕ «thro», бо ловило б through). Слова ≤ 4 літер — лише ціле слово (+s).
function leaks(en, def) {
  const d = " " + String(def).toLowerCase().replace(/[^a-z'-]+/g, " ") + " ";
  return en.toLowerCase().split(/[\s-]+/).filter(t => t && !STOP.test(t)).some(t => {
    if (t.length <= 4) return d.includes(" " + t + " ") || d.includes(" " + t + "s ");
    let st = t.replace(/[yes]$/, "");
    if (st.length >= 6) st = st.slice(0, -2);
    return new RegExp("[ '-]" + st.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(d);
  });
}
module.exports = { leaks };   // defs-add.js бере звідси ту саму перевірку кореня
if (require.main !== module) return;
const badList = x => !Array.isArray(x) || !x.length || x.some(s => typeof s !== "string" || !s.trim());

const cur = load(fs.readFileSync(FILE, "utf8"));

if (process.argv.includes("--stats")) {
  const lv = new Map();
  for (const k in cur.CEFR_DATA) for (const w of String(cur.CEFR_DATA[k]).split("|")) if (w) lv.set(w, k);
  const c = {}, seen = new Set();
  for (const w of cur.WORDS) {
    const en = enOf(w); if (seen.has(en)) continue; seen.add(en);
    const L = lv.get(en.toLowerCase()) || "none", o = c[L] || (c[L] = { n: 0, d: 0, s: 0, a: 0 });
    o.n++; if (cur.DEFS[en]) o.d++; if (cur.SYNS[en] && cur.SYNS[en].length) o.s++; if (cur.ANTS[en] && cur.ANTS[en].length) o.a++;
  }
  const pc = (a, n) => (n ? Math.round(a / n * 100) : 0) + "%";
  console.log("рівень  слів   DEFS        SYNS        ANTS");
  for (const L of ["A1", "A2", "B1", "B2", "C1", "C2", "none"]) { const o = c[L]; if (!o) continue;
    console.log(L.padEnd(6), String(o.n).padStart(5), (o.d + " " + pc(o.d, o.n)).padStart(11), (o.s + " " + pc(o.s, o.n)).padStart(11), (o.a + " " + pc(o.a, o.n)).padStart(11)); }
  console.log("\nусього ключів: DEFS " + Object.keys(cur.DEFS).length + " · SYNS " + Object.keys(cur.SYNS).length + " · ANTS " + Object.keys(cur.ANTS).length);
  const lk = Object.keys(cur.DEFS).filter(k => leaks(k, cur.DEFS[k]));
  console.log("\nтлумачення з коренем слова (" + lk.length + "):\n  " + lk.map(k => k + " — " + cur.DEFS[k]).join("\n  "));
  process.exit(0);
}

let old;
try { old = load(execSync("git show HEAD:dict.js", { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString()); }
catch (e) { console.log("ℹ️  DEFS: HEAD недоступний — пропускаю перевірку нових слів"); process.exit(0); }

const oldKeys = new Set(old.WORDS.map(enOf));
const fresh = [...new Set(cur.WORDS.map(enOf).filter(k => !oldKeys.has(k)))].filter(k => !ALLOW.has(k));
const errs = [];
for (const k of fresh) {
  if (!cur.DEFS[k]) { errs.push(k + " — немає DEFS"); continue; }
  if (leaks(k, cur.DEFS[k])) errs.push(k + " — тлумачення містить слово/корінь: «" + cur.DEFS[k] + "»");
}
// SYNS / ANTS — формат перевіряємо для всіх ключів, що змінились відносно HEAD
for (const B of ["SYNS", "ANTS"]) for (const k in cur[B])
  if (JSON.stringify(cur[B][k]) !== JSON.stringify(old[B][k]) && badList(cur[B][k])) errs.push(k + " — " + B + " має бути непорожнім масивом рядків");

if (!errs.length) { console.log(fresh.length ? "✅ DEFS: усі " + fresh.length + " нових слів мають тлумачення" : "✅ DEFS: нових слів немає"); process.exit(0); }
console.log("❌ DEFS (" + errs.length + "):\n   " + errs.join("\n   "));
console.log("\n   Без тлумачення слово ніколи не трапиться в Def (меню English only і похід).");
console.log("   Додай поле def у партію add-batch.js (або допиши в DEFS у dict.js). Власна назва — ALLOW у check-defs.js.");
process.exit(1);
