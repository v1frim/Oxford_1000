#!/usr/bin/env node
// prompt-clash.js — ДОРАДЧИЙ звіт: промпти UA→EN, на які є ще одна законна
// англійська відповідь.
//
// Дві групи (див. `isCorrect`, гілка `mode === "ua-en"` в index.html):
//   A) той самий промпт — ОСНОВНИЙ `ua` у кількох карток («стіл» → table / desk).
//      ⚠️ Рушій це ВЖЕ приймає: перевірка бере будь-яку картку, чий `getUa`
//      збігається з показаним промптом. Група А — довідкова, не потребує правок.
//   B) промпт картки збігається з `uaAlt` ІНШОЇ картки («працівник» → employee,
//      а «працівник» є в uaAlt у worker). Рушій uaAlt при цьому НЕ дивиться,
//      тож відповідь `worker` летить у ✗. Це і є справжні прогалини.
//
// Пари, зведені через `enAlt`, не рахуються — там відповідь уже приймається.
//
// Використання:  node prompt-clash.js [A|B] [--basic]
//   --basic  — лише кластери, де ОБИДВІ сторони A1–B1 (те, що реально болить)

const fs = require("fs");
const s = fs.readFileSync(require("path").join(__dirname, "dict.js"), "utf8");
const a = s.indexOf("const WORDS = ["), b = s.indexOf("\n];", a);
const recs = [...s.slice(a, b).matchAll(
  /\{en:"([^"]+)",ua:(\[[^\]]*\]|"[^"]*")(?:,uaAlt:\[([^\]]*)\])?(?:,enAlt:\[([^\]]*)\])?/g)]
  .map((m) => ({ en: m[1], ua: JSON.parse(m[2].startsWith("[") ? m[2] : "[" + m[2] + "]"),
                 alt: m[3] ? JSON.parse("[" + m[3] + "]") : [],
                 enAlt: m[4] ? JSON.parse("[" + m[4] + "]") : [] }));

const c = s.indexOf("const CEFR_DATA"), ce = s.indexOf("\n};", c);
const lvl = {};
for (const m of s.slice(c, ce).matchAll(/([A-C][12]): "([^"]*)"/g))
  for (const w of m[2].split("|")) lvl[w] = m[1];
const L = (e) => lvl[e.replace(/^to /, "")] || lvl[e] || "—";
const BASIC = new Set(["A1", "A2", "B1"]);
const linked = (x, y) => x.enAlt.includes(y.en) || y.enAlt.includes(x.en);

const group = (process.argv[2] || "B").toUpperCase();
const onlyBasic = process.argv.includes("--basic");
const rows = [];

if (group === "A") {
  const byUa = {};
  for (const r of recs) for (const u of r.ua) (byUa[u] = byUa[u] || []).push(r);
  for (const [u, rs] of Object.entries(byUa)) {
    if (rs.length < 2) continue;
    if (!rs.some((x, i) => rs.some((y, j) => j > i && !linked(x, y)))) continue;
    if (onlyBasic && rs.filter((r) => BASIC.has(L(r.en))).length < 2) continue;
    rows.push(u + " → " + rs.map((r) => r.en + "(" + L(r.en) + ")").join(" / "));
  }
} else {
  const byAlt = {};
  for (const r of recs) for (const u of r.alt) (byAlt[u] = byAlt[u] || []).push(r);
  for (const r of recs) for (const u of r.ua) {
    let o = (byAlt[u] || []).filter((x) => x.en !== r.en && !linked(x, r));
    if (onlyBasic) { if (!BASIC.has(L(r.en))) continue; o = o.filter((x) => BASIC.has(L(x.en))); }
    if (o.length) rows.push(u + " → " + r.en + "(" + L(r.en) + ")  ⟵ також: " +
      o.map((x) => x.en + "(" + L(x.en) + ")").join(", "));
  }
}
console.log(`група ${group}${onlyBasic ? " (лише A1–B1)" : ""}: ${rows.length}`);
console.log(rows.join("\n"));
