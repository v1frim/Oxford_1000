#!/usr/bin/env node
// hints-add.js — вставка уточнень відтінку значення в блок HINTS у dict.js.
//
// Навіщо: один український глос часто має кілька англійських відповідників
// («складний» = hard / difficult / complex / …). HINTS показує в дужках, ЧИМ вони
// різняться — у рядку правильної відповіді, ПІСЛЯ відповіді користувача.
//
// Використання:
//   node hints-add.js hints-batch.json
//     hints-batch.json = {"difficult":"розумово важкий","complex":"із багатьох частин"}
//
// Ключ = wordKey (перша форма `en`, з «to » для дієслів — точно як у картці)
// АБО складений «en:ua» для конкретної картки, напр. {"tip:порада":"практична підказка"}.
// ⚠️ Для слів із ДВОМА картками (tip, hot, light, cool…) складений ключ ОБОВ'ЯЗКОВИЙ —
// голий скрипт відхилить, бо гра його ігнорує (підказка одного сенсу бреше на другому).
// Уже наявні ключі НЕ перезаписуються без --force; порядок тримається сталим
// (нові дописуються в кінець блоку, згруповані за партіями).

const fs = require("fs");
const P = require("path").join(__dirname, "dict.js");   // дані живуть у dict.js (сесія 48)
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
const en1 = (w) => (Array.isArray(w.en) ? w.en[0] : w.en);
const ua1 = (w) => (Array.isArray(w.ua) ? w.ua[0] : w.ua);
const keys = new Set(W.map(en1));
// Складений ключ картки «en:ua» (як у EXAMPLES). ⚠️ Для 23 слів із ДВОМА картками
// (tip=чайові/порада, hot=гарячий/гострий…) це ЄДИНИЙ робочий вид ключа: голий
// `hintFor` там ігнорує, бо підказка одного сенсу на другій картці бреше (сесія 45).
const cardKeys = new Set(W.map((w) => en1(w) + ":" + ua1(w)));
const pairs = new Set();
{ const seen = new Set(); W.forEach((w) => { const k = en1(w); if (seen.has(k)) pairs.add(k); seen.add(k); }); }

const lines = [], skipped = [], unknown = [], deadPair = [], parens = [];
for (const [k, v] of Object.entries(batch)) {
  // ⚠️ ДУЖКИ В САМІЙ ПІДКАЗЦІ ЗАБОРОНЕНІ (сесія 50, привід «jealousy»).
  // Гра рендерить підказку ЯК дужку: `withHint` віддає «слово (підказка)», а розбирає
  // це регексом `^(.+?)\s*\(([^)]+)\)$` — і в `wrapEnWord`, і в гілці en-ua
  // `showCorrection`. Дужка всередині підказки дає вкладеність
  // «jealousy (страх утратити своє (ревнощі))», регекс НЕ матчиться, і весь рядок
  // падає в один спан: підказка не тьмяніє, слово втрачає hover, IPA та озвучку,
  // а клік читає англійським голосом український текст.
  // Розширити регекс не можна: він мусить чіплятися за ОСТАННЮ групу (глос із
  // дисплейною дужкою + підказка), а це з вкладеністю несумісно. Тому чистимо ВХІД.
  // Замість дужок — тире: «спечений у духовці — тісто, запіканка», «розм. — бадьорий».
  if (/[()]/.test(v)) { parens.push(k); continue; }
  if (k.includes(":")) {
    if (!cardKeys.has(k)) { unknown.push(k); continue; }
  } else if (!keys.has(k)) { unknown.push(k); continue; }
  else if (pairs.has(k)) { deadPair.push(k); continue; }   // голий ключ слова-пари ніколи не покажеться
  if (have.has(k) && !force) { skipped.push(k); continue; }
  lines.push('  ' + JSON.stringify(k) + ': ' + JSON.stringify(v) + ',');
}
if (parens.length) {
  console.error("❌ дужки в тексті підказки ламають рендер (вкладена дужка) — заміни на тире: " +
    parens.map((k) => k + " → " + JSON.stringify(batch[k])).join(", "));
  process.exit(1);
}
if (deadPair.length) {
  console.error("❌ слово має дві картки — потрібен ключ «en:ua»: " +
    deadPair.map((k) => W.filter((w) => en1(w) === k).map((w) => k + ":" + ua1(w)).join(" / ")).join(", "));
  process.exit(1);
}
if (unknown.length) {
  console.error("❌ немає таких карток у WORDS: " + unknown.join(", "));
  process.exit(1);
}

// ⚠️ Нічого додавати — НЕ переписувати файл (сесія 50). Інакше рядок `insert` нижче
// дописує кому й порожній рядок у кінець блоку HINTS на кожен «порожній» прогін
// (усі ключі — дублі). Синтаксис від цього не падає, тож помітити важко.
if (!lines.length) {
  console.log("додано підказок: 0" + (skipped.length ? " | вже були: " + skipped.join(", ") : ""));
  process.exit(0);
}
const insert = block.replace(/,?\s*$/, "") + (block.trim().endsWith("{") ? "\n" : ",\n") + lines.join("\n");
fs.writeFileSync(P, html.slice(0, start) + insert + html.slice(end));
console.log("додано підказок: " + lines.length + (skipped.length ? " | вже були: " + skipped.join(", ") : ""));
