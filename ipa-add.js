#!/usr/bin/env node
// ipa-add.js — дописує транскрипції в `TRANS` (dict.js). Сесія 61.
// Навіщо: у підказці при наведенні IPA береться з `TRANS[слово]`, а для варіантів
// `enAlt` (trash can / garbage can на картці «dustbin») записів не було взагалі —
// користувач бачив транскрипцію лише в основного слова.
//
// Використання: node ipa-add.js batch.json [коментар]
//   batch.json = {"trash can":"/ˈtræʃ kæn/", ...}
// Наявні ключі НЕ перезаписує (виводить їх як пропущені). Норма — General American,
// стиль Cambridge US (ɑː, oʊ, ɜːr, ər); після запуску — ./verify.sh (там check-ipa.js).
const fs = require("fs"), path = require("path");
const FILE = path.join(__dirname, "dict.js");
const [, , batchFile, note] = process.argv;
if (!batchFile) { console.log("node ipa-add.js batch.json [коментар]"); process.exit(2); }
const batch = JSON.parse(fs.readFileSync(batchFile, "utf8"));
let src = fs.readFileSync(FILE, "utf8");
const TRANS = new Function(src + "; return TRANS;")();
const start = src.indexOf("const TRANS = {");
const end = src.indexOf("\n};", start);
if (start < 0 || end < 0) { console.log("❌ не знайшов блок TRANS"); process.exit(1); }
const add = [], skip = [];
for (const [k, v] of Object.entries(batch)) {
  if (!/^\/.+\/$/.test(v)) { console.log("❌ не схоже на IPA: " + k + " " + v); process.exit(1); }
  (TRANS[k] ? skip : add).push([k, v]);
}
if (add.length) {
  const lines = [];
  for (let i = 0; i < add.length; i += 4)
    lines.push("  " + add.slice(i, i + 4).map(([k, v]) => JSON.stringify(k) + ":" + JSON.stringify(v)).join(","));
  const block = ",\n  // ── " + (note || "ipa-add") + " ──\n" + lines.join(",\n");
  src = src.slice(0, end).replace(/,?\s*$/, "") + block + src.slice(end);
  fs.writeFileSync(FILE, src);
}
console.log("✅ додано " + add.length + (skip.length ? ", пропущено (вже є) " + skip.length + ": " + skip.map(x => x[0]).join(", ") : ""));
