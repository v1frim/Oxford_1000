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

const lines = [], skipped = [], unknown = [], deadPair = [], parens = [], tautology = [];
const inplace = [];   // --force: заміна НА МІСЦІ, а не дописування дубля в кінець
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
  // ⚠️ ПІДКАЗКА, ЩО ДОСЛІВНО ПОВТОРЮЄ ГЛОС — ЗАБОРОНЕНА (сесія 50, привід
  // «fortunately = на щастя (на щастя)»). Користувач: «у дужках я розумію що це
  // підказка того, що саме мається на увазі, але в даному випадку це вже просто
  // дублювання тексту». Правило HINTS і так каже писати підказку ЛИШЕ коли за той
  // самий глос конкурує інше англ. слово; якщо конкурента нема — підказки не має
  // бути взагалі, а якщо є — вона мусить РОЗРІЗНЯТИ, а не переписувати глос.
  {
    const g = k.includes(":") ? k.split(":").slice(1).join(":")
                              : (W.find((w) => en1(w) === k) || {}).ua;
    const norm = (x) => String(Array.isArray(x) ? x[0] : x)
      .replace(/\s*\([^)]*\)/g, "").trim().toLowerCase();
    if (g && norm(g) === norm(v)) { tautology.push(k + " = " + norm(g)); continue; }
  }
  if (k.includes(":")) {
    if (!cardKeys.has(k)) { unknown.push(k); continue; }
  } else if (!keys.has(k)) { unknown.push(k); continue; }
  else if (pairs.has(k)) { deadPair.push(k); continue; }   // голий ключ слова-пари ніколи не покажеться
  if (have.has(k) && !force) { skipped.push(k); continue; }
  // ⚠️ --force РАНІШЕ ДОПИСУВАВ ДУБЛЬ У КІНЕЦЬ БЛОКУ (сесія 50). Синтаксис не падав
  // (у JS-літералі виграє останній ключ), тож помітити було важко — я побачив лише
  // тому, що перерахував рядки блоку. Тепер наявний ключ переписується на місці.
  if (have.has(k)) { inplace.push([k, v]); continue; }
  lines.push('  ' + JSON.stringify(k) + ': ' + JSON.stringify(v) + ',');
}
if (tautology.length) {
  console.error("❌ підказка дослівно повторює глос — це «цвях (цвях)», а не підказка: " +
    tautology.join(", ") + "\n   якщо за глос НЕ конкурує інше англ. слово — підказка тут взагалі не потрібна");
  process.exit(1);
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

// ⚠️ УСІ ЗМІНИ — ЛИШЕ В МЕЖАХ БЛОКУ HINTS. Ключі на кшталт "funny"/"belief" є ще
// й у TRANS/EXAMPLES, тож заміна по всьому файлу зрізає саме їх. Я так і зробив
// уручну в сесії 50 — і знищив три транскрипції, довелось відкочувати dict.js.
let out = block;
for (const [k, v] of inplace) {
  const re = new RegExp('("' + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"\\s*:\\s*)"[^"]*"');
  if (!re.test(out)) { console.error("❌ не знайшов ключ у блоці HINTS: " + k); process.exit(1); }
  out = out.replace(re, (m, p1) => p1 + JSON.stringify(v));
}
// ⚠️ Нових ключів нема — файл усе одно перезаписуємо, якщо були заміни на місці.
// Але БЕЗ дописування коми: інакше кожен «порожній» прогін лишав кому й порожній
// рядок у кінці блоку (синтаксис не падає, тож слід накопичувався непомітно).
if (lines.length) {
  out = out.replace(/,?\s*$/, "") + (out.trim().endsWith("{") ? "\n" : ",\n") + lines.join("\n");
}
if (out !== block) fs.writeFileSync(P, html.slice(0, start) + out + html.slice(end));
console.log("додано: " + lines.length + " | переписано на місці: " + inplace.length +
  (skipped.length ? " | вже були: " + skipped.join(", ") : ""));
