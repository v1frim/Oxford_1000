#!/usr/bin/env node
// check-cefr.js — вартовий рівнів CEFR для НОВИХ слів.
//
// Навіщо: `CEFR_DATA` не перераховується автоматично — слово, якому не проставили
// рівень через `cefr-add.js`, мовчки падає в кошик «без рівня» у грі «🎓 Рівні».
// Помилки ніде не видно, тож пропуск помічається лише випадково (сесія 46).
//
// Що робить: порівнює WORDS у робочій копії з WORDS у git HEAD, бере ТІЛЬКИ нові
// ключі й вимагає, щоб кожен мав рівень. Старий кошик «без рівня» не чіпає —
// інакше перевірка була б суцільним шумом.
//
// Використання:
//   node check-cefr.js            — вартовий (входить у ./verify.sh)
//   node check-cefr.js --stats    — розклад по рівнях + список без рівня
//
// Якщо слово СВІДОМО лишається без рівня (власна назва, бренд) — додай його в ALLOW.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const FILE = path.join(ROOT, "index.html");

// Свідомо без рівня CEFR: власні назви, бренди, назви свят/країн.
// Після великого розподілу сесії 46 кошик «без рівня» = рівно цей список.
const ALLOW = new Set([
  "new year", "christmas", "easter", "halloween", "thanksgiving",
]);

function blocks(html) {
  const L = html.split("\n");
  const take = (a, b, name) => {
    const i = L.findIndex(x => a.test(x));
    const j = L.findIndex((x, k) => k > i && b.test(x));
    if (i < 0 || j < 0) throw new Error("не знайшов блок " + name);
    return L.slice(i, j + 1).join("\n");
  };
  const src = take(/^const WORDS = \[$/, /^\];$/, "WORDS") + "\n" +
              take(/^const CEFR_DATA = \{$/, /^\};$/, "CEFR_DATA");
  return new Function(src + "\nreturn {WORDS, CEFR_DATA};")();
}

const keyOf = w => String(Array.isArray(w.en) ? w.en[0] : w.en).toLowerCase();
const levelMap = D => {
  const m = new Map();
  for (const k in D) for (const w of String(D[k]).split("|")) if (w) m.set(w, k);
  return m;
};

const cur = blocks(fs.readFileSync(FILE, "utf8"));
const lv = levelMap(cur.CEFR_DATA);

if (process.argv.includes("--stats")) {
  const c = {}, none = [];
  for (const w of cur.WORDS) {
    const L = lv.get(keyOf(w)) || "none";
    c[L] = (c[L] || 0) + 1;
    if (L === "none") none.push(keyOf(w));
  }
  console.log("Розклад карток по рівнях:");
  for (const L of ["A1", "A2", "B1", "B2", "C1", "C2", "none"]) console.log("  " + L.padEnd(6), c[L] || 0);
  console.log("\nБез рівня (" + none.length + "):\n  " + none.join(", "));
  process.exit(0);
}

// ── вартовий: тільки те, що додалося відносно HEAD ────────────────────
let old = null;
try {
  old = blocks(execSync("git show HEAD:index.html", { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString());
} catch (e) {
  console.log("ℹ️  CEFR: HEAD недоступний — пропускаю перевірку нових слів");
  process.exit(0);
}

const oldKeys = new Set(old.WORDS.map(keyOf));
const fresh = cur.WORDS.map(keyOf).filter(k => !oldKeys.has(k));
const missing = fresh.filter(k => !lv.has(k) && !ALLOW.has(k));

if (!fresh.length) { console.log("✅ CEFR: нових слів немає"); process.exit(0); }
if (!missing.length) {
  console.log("✅ CEFR: усі " + fresh.length + " нових слів мають рівень");
  process.exit(0);
}

console.log("❌ CEFR: нові слова без рівня (" + missing.length + " із " + fresh.length + "):");
console.log("   " + missing.join(", "));
console.log("\n   Такі слова падають у кошик «без рівня» в грі «🎓 Рівні». Простав рівень:");
console.log("     echo '" + JSON.stringify(missing.map(en => ({ en }))) + "' > /tmp/lv.json");
console.log("     node cefr-add.js /tmp/lv.json B1        # рівень за змістом слова");
console.log("   Якщо рівень СВІДОМО не потрібен (власна назва) — додай слово в ALLOW у check-cefr.js.");
process.exit(1);
