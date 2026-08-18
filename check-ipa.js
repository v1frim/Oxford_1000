#!/usr/bin/env node
// check-ipa.js — вартовий американської норми в транскрипціях (сесія 50).
//
// Навіщо: гра називається UA → US, `speak()` виставляє `u.lang = "en-US"`, тож і
// транскрипція має бути General American. Але частина словника приїхала з БРИТАНСЬКИХ
// джерел, і користувач це помітив сам: «транскрипція гугл-перекладача відрізняється
// від нашої… і таке вже не вперше». Аудит підтвердив — 555 записів із 13625.
//
// ⚠️ ГОЛОВНЕ, ЩО ТРЕБА РОЗУМІТИ ПРО ЦЕЙ ФАЙЛ: транскрипція НЕ впливає на озвучку.
// `speak()` передає рушію САМЕ СЛОВО, і той вимовляє його за власним словником —
// `TRANS` ніде не читається. Тобто це суто те, що бачить око, і розійтись зі звуком
// воно може будь-коли. Саме тому потрібен вартовий: інакше помилку ніщо не ловить.
//
// Конвенція словника (виміряна, не вигадана — це стиль Cambridge US):
//   LOT    ɑː  (1491 записів проти 424 брит. ɒ)
//   GOAT   oʊ  (1323 проти 79 брит. əʊ)
//   NURSE  ɜːr (680 проти 153 ɝ)
//   lettER ər  (2217 проти 10 ɚ)
// ⚠️ CLOTH-винятку в цій системі НЕМА: Cambridge US дає office /ˈɑː.fɪs/,
// software /ˈsɑːft.wer/. Тобто ɒ → ɑː УНІВЕРСАЛЬНО, без «а тут ɔː».
//
// Використання:
//   node check-ipa.js           — вартовий (входить у ./verify.sh)
//   node check-ipa.js --stats   — розклад по категоріях + повні списки
//
// Свідомий виняток (запозичення, власна назва) → додай ключ у ALLOW.

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "dict.js");
const src = fs.readFileSync(FILE, "utf8");
const TRANS = new Function(src + "; return TRANS;")();

// Свідомо лишені записи. ⚠️ Обидва — ФРАНЦУЗЬКІ запозичення з НІМИМ кінцевим `r`
// (/ˌsɑːməlˈjeɪ/, /ˌhoʊtelˈjeɪ/), тобто хибне спрацювання детектора неротичності,
// а не британізм. Перш ніж дописувати сюди щось іще — перевір у словнику, що `r`
// справді не вимовляється, а не «мені так здається».
const ALLOW = new Set(["sommelier", "hotelier"]);

// ── ПРАВИЛА ──────────────────────────────────────────────────────────────────
// Кожне — суто британська риса, яка в General American не трапляється.
const RULES = [
  { id: "ɒ",   re: /ɒ/,          why: "брит. LOT — амер. ɑː (hot /hɑːt/, office /ˈɑːfɪs/)" },
  { id: "əʊ",  re: /əʊ/,         why: "брит. GOAT — амер. oʊ (stove /stoʊv/)" },
  { id: "ɐ",   re: /ɐ/,          why: "символ espeak-британського джерела — амер. ə або ər" },
  { id: "eə",  re: /eə/,         why: "брит. SQUARE — амер. er (their /ðer/)" },
  { id: "ɜː",  re: /ɜː(?!r)/,    why: "брит. неротичний NURSE — амер. ɜːr (worth /wɜːrθ/)" },
  // ⚠️ BATH — набір ЛЕКСИЧНИЙ, не фонологічний: брит. /ɑː/ там, де амер. /æ/, але
  // загального правила нема (father, pasta, calm — законні ɑː і в амер.). Тому тут
  // ЛИШЕ ті слова, де сам словник уже має standalone-форму з æ, а у фразах стояло ɑː:
  // half=/hæf/, class=/klæs/, branch=/bræntʃ/, vast=/væst/. Знайдено звіркою фраз зі
  // standalone-формами; натрапиш на нове таке слово — дописуй сюди тим самим методом.
  // ⚠️ ТІЛЬКИ перевірені лексеми. Спокуса дописати сюди «загальні» шматки на кшталт
  // `ɑːsk` чи `pɑːθ` — ПАСТКА: вони ловлять законний LOT (kiosk /ˈkiːɑːsk/,
  // mosque /mɑːsk/, hypothesis /haɪˈpɑːθəsɪs/). Я на цьому спіткнувся одразу.
  { id: "BATH", re: /hɑːf|klɑːs|brɑːntʃ|vɑːst/,
    why: "брит. BATH — амер. æ (half /hæf/, class /klæs/, branch /bræntʃ/)" },
];

// Неротичність: у слові є `r` у кінці складу, а в транскрипції жодного r/ɚ/ɝ.
// ⚠️ ɚ/ɝ САМІ кодують r — без цієї умови детектор дає суцільні хибні спрацювання
// (nerve /nɝv/ виглядав би «без r»). На цьому я вже спіткнувся під час аудиту.
const isNonRhotic = (word, ipa) =>
  /r([^a-z]|$)|r[bcdfghjklmnpqstvwxz]/.test(word.toLowerCase()) && !/[rɚɝ]/.test(ipa);

const stats = Object.create(null);
const hits = [];
for (const [word, ipa] of Object.entries(TRANS)) {
  if (ALLOW.has(word)) continue;
  const found = RULES.filter((r) => r.re.test(ipa)).map((r) => r.id);
  if (isNonRhotic(word, ipa)) found.push("неротичне");
  if (!found.length) continue;
  found.forEach((id) => (stats[id] = (stats[id] || 0) + 1));
  hits.push([word, ipa, found]);
}

const statsMode = process.argv.includes("--stats");
if (statsMode) {
  console.log("транскрипцій усього: " + Object.keys(TRANS).length);
  for (const r of RULES) console.log("  " + r.id.padEnd(10) + String(stats[r.id] || 0).padStart(5) + "  — " + r.why);
  console.log("  " + "неротичне".padEnd(10) + String(stats["неротичне"] || 0).padStart(5) + "  — у слові є r, у транскрипції немає");
  console.log("");
  hits.forEach(([w, i, f]) => console.log("  " + w.padEnd(24) + i.padEnd(28) + f.join(",")));
}

if (!hits.length) {
  console.log("✅ IPA: американська норма, британських форм немає");
  process.exit(0);
}
console.log("❌ IPA: " + hits.length + " записів із британськими формами");
if (!statsMode) {
  hits.slice(0, 15).forEach(([w, i, f]) => console.log("   " + w.padEnd(24) + i.padEnd(28) + f.join(",")));
  if (hits.length > 15) console.log("   … ще " + (hits.length - 15) + " — повний список: node check-ipa.js --stats");
}
process.exit(1);
