#!/usr/bin/env node
// check-song-words.js — які слова пісні ще НЕ ігрові слова в основному словнику.
//
// Допомагає докидати лексику пісень у WORDS: бере пісню з songs.js, витягує
// унікальні англійські слова з її рядків і звіряє кожне з WORDS (через ту саму
// runtime-логіку stemEn/EN_TO_UA, що й гра). Друкує два списки:
//   [X] ВЗАГАЛІ НЕМАЄ перекладу — ні ігрове слово, ні навіть hover (як bleed);
//   [~] hover є, але не окреме ігрове слово — переважно функційні (what, until…).
//
// Використання:
//   node check-song-words.js "Lit"      — фрагмент назви пісні (як у title)
//   node check-song-words.js "Fight"
//
// Далі: контентні слова зі списку [X] додаємо повноцінно за чеклистом
// (WORDS + TRANS + EXAMPLES + EXAMPLES_UA, приклади ВЛАСНІ — НЕ з лірики),
// уникаючи колізій перекладів, і ганяємо `node check-coverage.js` до OK.
// Сленг/вульгаризми у WORDS не додаємо (вони живуть у song.slang).

const fs = require("fs");
const path = require("path");
const ROOT = __dirname;
const NAME = process.argv[2] || "";
if (!NAME) { console.log("Вкажи фрагмент назви пісні: node check-song-words.js \"Lit\""); process.exit(1); }

const LINES = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").split("\n");
function sb(s, e) {
  const i = LINES.findIndex(l => s.test(l));
  if (i === -1) throw new Error("blk start: " + s);
  for (let j = i; j < LINES.length; j++) {
    if ((j > i || s.source === e.source) && e.test(LINES[j])) return LINES.slice(i, j + 1).join("\n");
  }
  throw new Error("blk end: " + e);
}
const blocks = [
  sb(/^function getEn\(w\)/, /^function getEn\(w\)/),
  sb(/^function getUa\(w\)/, /^function getUa\(w\)/),
  sb(/^const WORDS = \[$/, /^\];$/),
  sb(/^const EN_TO_UA = \(\(\) => \{$/, /^\}\)\(\);$/),
  sb(/^const HW_SKIP = new Set\(\[$/, /^\]\);$/),
  sb(/^const IRREGULAR = \{$/, /^\};$/),
  sb(/^function stemEn\(word\) \{$/, /^\}$/),
];
const S = new Function(blocks.join("\n") + "\nreturn {WORDS,getEn,EN_TO_UA,HW_SKIP,stemEn};")();

// headword-set: усі форми getEn (+ гола форма "to X")
const H = new Set();
for (const w of S.WORDS) for (const en of S.getEn(w)) {
  const k = en.toLowerCase();
  H.add(k);
  if (k.startsWith("to ")) H.add(k.slice(3));
}

const src = fs.readFileSync(path.join(ROOT, "songs.js"), "utf8");
const SONGS = new Function("return " + src.slice(src.indexOf("[", src.indexOf("const SONGS")), src.lastIndexOf("];") + 1))();
const song = SONGS.find(s => s.title.indexOf(NAME) === 0) || SONGS.find(s => s.title.indexOf(NAME) >= 0);
if (!song) { console.log("Пісню не знайдено:", NAME); process.exit(1); }
console.log("Пісня:", song.title, "| секцій:", song.sections.length);

const words = new Set();
for (const sec of song.sections) for (const l of sec.lines) {
  const toks = l.en.match(/[A-Za-z']+/g) || [];
  for (const raw of toks) {
    if (raw.indexOf("'") >= 0) continue;           // контракції пропускаємо
    const lw = raw.toLowerCase().replace(/[^a-z]/g, "");
    if (lw.length > 2) words.add(lw);
  }
}

const missing = [], hoverOnly = [];
for (const w of [...words].sort()) {
  if (H.has(w)) continue;                           // вже ігрове слово
  const st = S.stemEn(w);
  if (st && H.has(st)) continue;                    // інфлексія ігрового слова
  if (st) hoverOnly.push(w + "→" + st);        // hover є, але не ігрове
  else missing.push(w);                             // взагалі немає перекладу
}
console.log("\nУнікальних слів (>2 літери, без контракцій): " + words.size);
console.log("\n[X] ВЗАГАЛІ НЕМАЄ перекладу (" + missing.length + "):\n  " + (missing.join(", ") || "—"));
console.log("\n[~] hover є, але не окреме ігрове слово (" + hoverOnly.length + "):\n  " + (hoverOnly.join(", ") || "—"));
