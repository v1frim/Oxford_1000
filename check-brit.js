#!/usr/bin/env node
// check-brit.js — вартовий американської норми в НАПИСАННІ слів (сесія 51).
//
// Навіщо: гра називається UA → US, транскрипції вже приведені до General American
// (`check-ipa.js`, сесія 50), але самі КЛЮЧІ карток лишались подекуди британськими —
// і користувач учив «favourite», «grey», «licence plate» як основну форму. Аудит
// сесії 51 знайшов 60 таких карток і 129 прикладних речень.
// Конвенція репо (handoff, сесія 42): американське написання — ОСНОВНЕ (`en`),
// британське йде в `enAlt`, де воно й далі приймається як відповідь.
//
// ⚠️ ДВА НЕЗАЛЕЖНІ ДЕТЕКТОРИ, і це не дублювання:
//   A. СТРУКТУРНИЙ — картка, чий ключ перетворюється на власний `enAlt`
//      британсько-американським правилом. Лексикону не потребує, тож ловить БУДЬ-ЯКИЙ
//      клас, включно з -ise/-ize, який за списком слів не відрізнити від `advise`.
//      Хибне спрацювання тут неможливе за побудовою: обидві форми лежать в одній картці.
//   B. ЛЕКСЕМНИЙ — список конкретних британських основ. Потрібен для карток, де
//      американського варіанта НЕМА ВЗАГАЛІ (саме такими були `favourite`, `flavour`,
//      `colourful`), і для тексту прикладних речень.
//
// ⚠️ ЧОМУ НЕ «загальне правило -our → -or»: воно ловить four, hour, tour, flour, your.
// Тому детектор B працює за списком основ, а не за суфіксом. Дописуй у BRIT_LEX.
//
// Використання:
//   node check-brit.js           — вартовий (входить у ./verify.sh)
//   node check-brit.js --stats   — повні списки знайденого
//
// Свідомий виняток → ALLOW. Там уже лежить `greyhound` (в амер. англійській теж через
// grey) — а от `cheque` у список основ СВІДОМО не внесений: його амер. форма `check`
// зайнята дієсловом «перевіряти», тож картка лишається британською навмисно.

const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "dict.js"), "utf8");
const WORDS = new Function(src + "; return WORDS;")();
const EXAMPLES = new Function(src + "; return EXAMPLES;")();

// ⚠️ СВІДОМІ ВИНЯТКИ — тут лежать саме ХИБНІ СПРАЦЮВАННЯ, а не «дозволені британізми».
// Основа шукається ЯК ПІДРЯДОК (щоб ловити colourful, epicentre, kilometre, fibreglass,
// neighbourhood, snowplough), і платня за це — жменя слів, які просто містять ті букви:
// «programmer» ⊃ programme, «sombrero» ⊃ sombre, «greyhound» ⊃ grey (в амер. теж через grey).
// ⚠️ Обмежити «підрядок» суфіксом я пробував — тоді тихо зникає `fibreglass`, а мовчазний
// пропуск гірший за список із трьох слів. Нове хибне спрацювання → дописуй СЮДИ.
// ⚠️ `cheque` у BRIT_LEX не внесений навмисно, а не забутий: його амер. форма `check`
// зайнята дієсловом «перевіряти», тож ця картка лишається британською свідомо.
const ALLOW = new Set(["programmer", "programmers", "sombrero", "sombreros",
                       "greyhound", "greyhounds"]);

// A. структурні правила «британське → американське». Застосовуються ЛИШЕ до ключа,
// і спрацьовують тільки якщо результат ДОСЛІВНО збігається з власним `enAlt` картки —
// тому широкі правила тут безпечні: обидві форми лежать в одному записі.
const RULES = [
  [/our\b/g, "or"], [/ours\b/g, "ors"], [/ise\b/g, "ize"], [/ising\b/g, "izing"],
  [/isation\b/g, "ization"], [/re\b/g, "er"], [/res\b/g, "ers"],
  [/(defen|offen|licen|preten)ce\b/g, "$1se"],      // ⚠️ вузько: широке ce→se ламає practice
  [/lling/g, "ling"], [/lled\b/g, "led"], [/ae/g, "e"], [/oeu/g, "eu"],
  // ⚠️ -logue → -log СВІДОМО НЕ ПРАВИЛО: в амер. англійській «dialogue» і «catalogue»
  // нормативні (Merriam-Webster подає їх основними), тобто це не британізм, а
  // розщеплена норма. Прапорець тут був би хибний.
];

// B. британські основи. Шукаються ЯК ПІДРЯДОК — саме тому ловляться colourful,
// epicentre, kilometre, microfibre, fibreglass, neighbourhood, snowplough.
const BRIT_LEX = [
  ["colour", "color"], ["honour", "honor"], ["favour", "favor"], ["flavour", "flavor"],
  ["harbour", "harbor"], ["labour", "labor"], ["neighbour", "neighbor"], ["humour", "humor"],
  ["rumour", "rumor"], ["odour", "odor"], ["vapour", "vapor"], ["valour", "valor"],
  ["endeavour", "endeavor"], ["splendour", "splendor"], ["parlour", "parlor"],
  ["tumour", "tumor"], ["saviour", "savior"], ["behaviour", "behavior"], ["armour", "armor"],
  ["rigour", "rigor"], ["vigour", "vigor"], ["candour", "candor"], ["clamour", "clamor"],
  ["demeanour", "demeanor"], ["fervour", "fervor"], ["ardour", "ardor"],
  ["centre", "center"], ["theatre", "theater"], ["metre", "meter"], ["litre", "liter"],
  ["fibre", "fiber"], ["calibre", "caliber"], ["sombre", "somber"], ["spectre", "specter"],
  ["lustre", "luster"], ["defence", "defense"], ["offence", "offense"],
  ["licence", "license"], ["pretence", "pretense"], ["aluminium", "aluminum"],
  ["jewellery", "jewelry"], ["storey", "story"], ["grey", "gray"], ["kerb", "curb"],
  ["plough", "plow"], ["mould", "mold"], ["smoulder", "smolder"], ["moustache", "mustache"],
  ["pyjamas", "pajamas"], ["programme", "program"], ["fulfilment", "fulfillment"],
  ["enrolment", "enrollment"], ["instalment", "installment"], ["skilful", "skillful"],
  ["wilful", "willful"], ["draught", "draft"], ["gaol", "jail"], ["tyre", "tire"],
  ["snorkelling", "snorkeling"], ["watercolour", "watercolor"], ["sabre", "saber"],
];

const en1 = (w) => (Array.isArray(w.en) ? w.en[0] : w.en);
const hasBrit = (token) => {
  const t = token.toLowerCase();
  if (ALLOW.has(t)) return null;
  for (const [b, a] of BRIT_LEX) {
    const i = t.indexOf(b);
    if (i >= 0) return t.slice(0, i) + a + t.slice(i + b.length);
  }
  return null;
};

const keyHits = [], sentHits = [];
for (const w of WORDS) {
  const k = en1(w);
  if (ALLOW.has(k.toLowerCase())) continue;
  // A — ключ перетворюється на власний enAlt
  let structural = null;
  for (const [re, rep] of RULES) {
    const cand = k.replace(re, rep);
    if (cand !== k && (w.enAlt || []).includes(cand)) { structural = cand; break; }
  }
  // B — британська основа в ключі
  const lexical = k.split(/[\s-]/).map((t) => hasBrit(t)).some(Boolean)
    ? k.split(/(\s|-)/).map((t) => hasBrit(t) || t).join("") : null;
  if (structural || lexical) keyHits.push([k, structural || lexical, structural ? "A" : "B"]);
}
for (const [k, sent] of Object.entries(EXAMPLES)) {
  for (const raw of String(sent).split(/[^A-Za-z'-]+/)) {
    if (!raw) continue;
    const amer = hasBrit(raw);
    if (amer) sentHits.push([k, raw, amer, sent]);
  }
}

const stats = process.argv.includes("--stats");
if (!keyHits.length && !sentHits.length) {
  console.log("✅ Написання: американська норма, британських ключів немає");
  process.exit(0);
}
console.log("❌ БРИТАНСЬКЕ НАПИСАННЯ (ключів: " + keyHits.length + ", у реченнях: " + sentHits.length + ")\n");
if (keyHits.length) {
  console.log("Ключі карток — перенеси британську форму в enAlt, американську зроби `en`:");
  for (const [k, a, d] of (stats ? keyHits : keyHits.slice(0, 20)))
    console.log("  [" + d + "] " + k + "  →  " + a);
  if (!stats && keyHits.length > 20) console.log("  … ще " + (keyHits.length - 20) + " (--stats)");
}
if (sentHits.length) {
  console.log("\nПрикладні речення:");
  for (const [k, raw, amer, sent] of (stats ? sentHits : sentHits.slice(0, 20)))
    console.log("  " + k + ": " + raw + " → " + amer + "\n    « " + sent);
  if (!stats && sentHits.length > 20) console.log("  … ще " + (sentHits.length - 20) + " (--stats)");
}
console.log("\nСвідомий виняток (як greyhound) → ALLOW у check-brit.js");
process.exit(1);
