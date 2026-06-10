#!/usr/bin/env node
// check-coverage.js — сканер покриття словника для прикладних речень.
//
// Знаходить у реченнях EXAMPLES слова, які гра покаже БЕЗ перекладу
// (hover-тултіп порожній). Відтворює точну runtime-логіку index.html:
// stemEn → EN_TO_UA (з WORDS + ручні m.set) → IRREGULAR → суфікси.
//
// Використання:
//   node check-coverage.js          — скан EXAMPLES (основна перевірка)
//   node check-coverage.js --json   — те саме, машинний вивід
//
// ПРОЦЕДУРА (handoff.md → «Правило додавання нових слів»):
// після БУДЬ-ЯКОЇ зміни словника чи прикладів запусти цей скрипт.
// Він має вивести "OK". Якщо є missing-слова — додай кожне повноцінно
// (WORDS + TRANS + EXAMPLES + EXAMPLES_UA) і перезапусти до чистого OK.
// Власні назви (імена людей/міст) — у список ALLOW нижче, не в словник.

const fs = require("fs");
const path = require("path");

const HTML = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const LINES = HTML.split("\n");

// Імена людей, які свідомо НЕ перекладаємо (TTS-only — це ок).
// Географічні/культурні власні назви сюди НЕ додавати — їм даємо
// hover-переклад через m.set в EN_TO_UA (Italy → Італія тощо).
const ALLOW = new Set([
  "tom", "mary", "john", "anna", "sarah", "peter", "jack", "emma", "alice",
  "bob", "david", "lisa", "mike", "james", "kate", "sam", "max", "lucy",
  "leo", "alexander", "fleming",
]);

function sliceBlock(startRe, endRe, label) {
  const s = LINES.findIndex((l) => startRe.test(l));
  if (s === -1) throw new Error("Не знайдено початок блоку: " + label);
  for (let i = s; i < LINES.length; i++) {
    if (i > s || startRe.source === endRe.source) {
      if (endRe.test(LINES[i])) return LINES.slice(s, i + 1).join("\n");
    }
  }
  throw new Error("Не знайдено кінець блоку: " + label);
}

const blocks = [
  sliceBlock(/^function getEn\(w\)/, /^function getEn\(w\)/, "getEn"),
  sliceBlock(/^function getUa\(w\)/, /^function getUa\(w\)/, "getUa"),
  sliceBlock(/^const WORDS = \[$/, /^\];$/, "WORDS"),
  sliceBlock(/^const TRANS = \{$/, /^\};$/, "TRANS"),
  sliceBlock(/^const EXAMPLES = \{$/, /^\};$/, "EXAMPLES"),
  sliceBlock(/^const EXAMPLES_UA = \{$/, /^\};$/, "EXAMPLES_UA"),
  sliceBlock(/^const EN_TO_UA = \(\(\) => \{$/, /^\}\)\(\);$/, "EN_TO_UA"),
  sliceBlock(/^const HW_SKIP = new Set\(\[$/, /^\]\);$/, "HW_SKIP"),
  sliceBlock(/^const IRREGULAR = \{$/, /^\};$/, "IRREGULAR"),
  sliceBlock(/^function stemEn\(word\) \{$/, /^\}$/, "stemEn"),
];

const sandbox = new Function(
  blocks.join("\n") +
    "\nreturn {WORDS, TRANS, EXAMPLES, EXAMPLES_UA, EN_TO_UA, HW_SKIP, IRREGULAR, stemEn, getEn};"
)();
const { WORDS, TRANS, EXAMPLES, EXAMPLES_UA, EN_TO_UA, HW_SKIP, stemEn, getEn } = sandbox;

// ── Скан 1: слова в реченнях EXAMPLES без перекладу ──
const missing = new Map(); // lower → {count, caps:Set, samples:Set}
for (const [key, sentence] of Object.entries(EXAMPLES)) {
  for (const m of String(sentence).matchAll(/[A-Za-z']+/g)) {
    const raw = m[0];
    if (raw.includes("'")) continue; // скорочення (didn't, it's) — пропуск
    const lower = raw.toLowerCase().replace(/[^a-z]/g, "");
    // та сама умова, що TTS-only гілка wrapSentence:
    if (lower.length <= 2 || HW_SKIP.has(lower)) continue;
    if (stemEn(raw) !== null) continue; // переклад є
    if (ALLOW.has(lower)) continue;     // власна назва — ок
    if (!missing.has(lower)) missing.set(lower, { count: 0, caps: new Set(), samples: new Set() });
    const e = missing.get(lower);
    e.count++;
    e.caps.add(raw);
    if (e.samples.size < 2) e.samples.add(key + ": " + sentence);
  }
}

// ── Скан 2: повнота записів WORDS (TRANS / EXAMPLES / EXAMPLES_UA) ──
const incomplete = [];
for (const w of WORDS) {
  const en = getEn(w)[0];
  const bare = en.replace(/^to /, "");
  // дзеркало runtime-логіки wrapEnWord: TRANS[w] || TRANS[bare] || TRANS[bare.toLowerCase()]
  const hasTrans = TRANS[en] !== undefined || TRANS[bare] !== undefined || TRANS[bare.toLowerCase()] !== undefined;
  const hasEx = EXAMPLES[en] !== undefined || EXAMPLES[bare] !== undefined;
  const exKey = EXAMPLES[en] !== undefined ? en : bare;
  const hasExUa = !hasEx || EXAMPLES_UA[exKey] !== undefined;
  if (!hasTrans || !hasEx || !hasExUa)
    incomplete.push(en + " [" + [!hasTrans && "TRANS", !hasEx && "EXAMPLES", !hasExUa && "EXAMPLES_UA"].filter(Boolean).join(", ") + "]");
}

const sorted = [...missing.entries()].sort((a, b) => b[1].count - a[1].count);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ missing: Object.fromEntries(sorted.map(([w, e]) => [w, e.count])), incomplete }, null, 1));
  process.exit(sorted.length ? 1 : 0);
}

console.log("Слів у WORDS: " + WORDS.length + " | Речень EXAMPLES: " + Object.keys(EXAMPLES).length + " | EN_TO_UA ключів: " + EN_TO_UA.size);
if (incomplete.length) {
  console.log("\n⚠ Неповні записи WORDS (" + incomplete.length + "):");
  incomplete.forEach((x) => console.log("  " + x));
}
if (sorted.length === 0) {
  console.log("\n✅ OK — усі слова в прикладних реченнях мають переклад.");
} else {
  console.log("\n❌ Слова в реченнях БЕЗ перекладу (" + sorted.length + "):\n");
  for (const [w, e] of sorted) {
    console.log(w + "  (×" + e.count + ")");
    e.samples.forEach((s) => console.log("    « " + s));
  }
  process.exitCode = 1;
}
