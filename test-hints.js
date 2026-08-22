// Браузерний тест підказок HINTS (сесія 44) — реальний Chromium, реальний index.html.
//
// Запуск:  npm i playwright-core && node test-hints.js
//          (або PW_CORE=/шлях/до/node_modules/playwright-core node test-hints.js)
//
// Перевіряє: підказка з'являється в рядку правильної відповіді в обох напрямках,
// НЕ з'являється в промпті, не ламає hover/TTS на англійських словах, а слова
// без підказки рендеряться як раніше.

const fs = require("fs");
const path = require("path");
const PAGE = "file://" + path.join(__dirname, "index.html");
const BROWSERS = "/opt/pw-browsers";

function loadChromium() {
  for (const t of [process.env.PW_CORE, "playwright-core"].filter(Boolean)) {
    try { return require(t).chromium; } catch (e) { /* далі */ }
  }
  console.log("⚠️  playwright-core не знайдено:  npm i playwright-core");
  process.exit(2);
}
function chromePath() {
  const dir = fs.existsSync(BROWSERS) && fs.readdirSync(BROWSERS).find((d) => /^chromium-\d/.test(d));
  if (!dir) { console.log("⚠️  Chromium не знайдено в " + BROWSERS); process.exit(2); }
  return path.join(BROWSERS, dir, "chrome-linux", "chrome");
}

(async () => {
  const browser = await loadChromium().launch({ executablePath: chromePath(), args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  const ok = [], bad = [];
  const t = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

  await page.goto(PAGE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1200);

  // 1. дані на місці
  const data = await page.evaluate(() => ({
    n: Object.keys(HINTS).length,
    difficult: HINTS["difficult"],
    // Усі ключі HINTS мають існувати як картки, інакше підказка мертва. Ключ буває
    // голий («difficult») або складений «en:ua» («tip:порада», сесія 45).
    // ⚠️ Голий ключ слова з ДВОМА картками теж сирота: `hintFor` його ігнорує.
    orphans: Object.keys(HINTS).filter((k) => {
      const en1 = (w) => (Array.isArray(w.en) ? w.en[0] : w.en);
      const ua1 = (w) => (Array.isArray(w.ua) ? w.ua[0] : w.ua);
      if (k.includes(":")) return !WORDS.some((w) => en1(w) + ":" + ua1(w) === k);
      const cards = WORDS.filter((w) => en1(w) === k);
      if (cards.length === 1) return false;
      // ⚠️ Ключ-варіант з `enAlt` теж живий (сесія 51): у UA→US `getCorrectAnswer`
      // проганяє enAlt через той самий `withHint(e)`, тож «donut (спрощене амер.
      // написання)» рендериться поруч із «doughnut». Сиротою він не є.
      if (cards.length === 0) return !WORDS.some((w) => (w.enAlt || []).includes(k));
      return true;
    }),
  }));
  t("HINTS наповнений", data.n > 0, String(data.n));
  t("немає ключів-сиріт", data.orphans.length === 0, data.orphans.slice(0, 5).join(","));

  // 2. UA→US: рядок відповіді містить підказки для кожного варіанта
  const uaEn = await page.evaluate(() => {
    const idx = WORDS.findIndex((w) => (Array.isArray(w.en) ? w.en[0] : w.en) === "difficult");
    currentWordIndex = idx; currentWord = WORDS[idx]; mode = "ua-en";
    const ans = getCorrectAnswer();
    showCorrection(ans);
    const el = document.getElementById("correction-answer");
    return { ans, html: el.innerHTML, hints: el.querySelectorAll(".ans-hint").length,
             words: el.querySelectorAll("span.hw").length };
  });
  t("UA→US: підказка в тексті відповіді", uaEn.ans.includes("difficult (розумово важкий)"), uaEn.ans);
  t("UA→US: кілька підказок у списку", uaEn.hints >= 3, String(uaEn.hints));
  t("UA→US: англ. слова лишились клікабельні", uaEn.words >= 3, String(uaEn.words));
  t("UA→US: дужка НЕ всередині слова", !/<span class="hw"[^>]*>[^<]*\(/.test(uaEn.html));

  // 3. US→UA: підказка чіпляється до основного глоса
  const enUa = await page.evaluate(() => {
    const idx = WORDS.findIndex((w) => (Array.isArray(w.en) ? w.en[0] : w.en) === "difficult");
    currentWordIndex = idx; currentWord = WORDS[idx]; mode = "en-ua"; currentShown = "difficult";
    const ans = getCorrectAnswer();
    showCorrection(ans);
    const el = document.getElementById("correction-answer");
    return { ans, hints: el.querySelectorAll(".ans-hint").length, text: el.textContent };
  });
  t("US→UA: підказка після основного глоса", enUa.ans.startsWith("складний (розумово важкий)"), enUa.ans);
  t("US→UA: підказка окремим спаном", enUa.hints === 1, String(enUa.hints));
  t("US→UA: uaAlt лишились у рядку", enUa.text.includes("важкий"), enUa.text);

  // 3b. enAlt-варіант дістає СВОЮ підказку (сесія 51, привід «пончик = doughnut / donut»).
  // Панель UA→US показує і enAlt-синоніми, і `getCorrectAnswer` жене їх через той самий
  // `withHint(e)` — тож голий ключ HINTS для варіанта робочий. Позначаємо амер./брит.
  const alt = await page.evaluate(() => {
    const idx = WORDS.findIndex((w) => (Array.isArray(w.en) ? w.en[0] : w.en) === "doughnut");
    currentWordIndex = idx; currentWord = WORDS[idx]; mode = "ua-en";
    const ans = getCorrectAnswer();
    showCorrection(ans);
    const el = document.getElementById("correction-answer");
    return { ans, hints: el.querySelectorAll(".ans-hint").length,
             words: [...el.querySelectorAll("span.hw")].map((x) => x.textContent) };
  });
  t("enAlt: варіант має власну підказку", alt.ans.includes("donut (спрощене амер. написання)"), alt.ans);
  t("enAlt: основне слово теж підписане", alt.ans.includes("doughnut (повне написання"), alt.ans);
  t("enAlt: обидві підказки окремими спанами", alt.hints === 2, String(alt.hints));
  t("enAlt: слова лишились клікабельні без дужки",
    alt.words.includes("doughnut") && alt.words.includes("donut"), alt.words.join("|"));

  // 3в. АВТОПОЗНАЧКА «амер./брит.» (сесія 51). Обчислюється з пари, а не з даних:
  // правило застосовується до основного `en` і спрацьовує, лише якщо результат дослівно
  // дорівнює наявному `enAlt` — тому широкі суфіксні правила не чіпають four/tour/doctor.
  const reg = await page.evaluate(() => {
    const out = {};
    const say = (q) => {
      const i = WORDS.findIndex((w) => (Array.isArray(w.en) ? w.en[0] : w.en) === q);
      if (i < 0) return "НЕМА";
      currentWordIndex = i; currentWord = WORDS[i]; mode = "ua-en";
      return getCorrectAnswer();
    };
    out.jewelry = say("jewelry");
    out.cheque = say("cheque");
    out.doughnut = say("doughnut");
    out.math = say("math");
    // ⚠️ Правило САМЕ ПО СОБІ перетворює будь-яке «-or» на «-our» — гарантію дає не воно,
    // а те, що результат мусить ДОСЛІВНО збігтися з наявним `enAlt`. Тому перевіряємо
    // не абстрактні рядки, а РЕАЛЬНІ пари словника: жоден лексичний синонім не позначений.
    out.negative = ["youngster:youth", "idle:lazy", "math:mathematics", "correct:right"]
      .filter((pair) => { const [a, b] = pair.split(":"); return isBritSpelling(a, b) || isBritSpelling(b, a); });
    out.marked = WORDS.reduce((n, w) => {
      const m = Array.isArray(w.en) ? w.en[0] : w.en;
      return n + (w.enAlt || []).filter((a) => isBritSpelling(m, a) || isBritSpelling(a, m)).length;
    }, 0);
    // рендер: дві підказки окремими спанами, слова лишились клікабельні
    const i = WORDS.findIndex((w) => (Array.isArray(w.en) ? w.en[0] : w.en) === "jewelry");
    currentWordIndex = i; currentWord = WORDS[i]; mode = "ua-en";
    showCorrection(getCorrectAnswer());
    const el = document.getElementById("correction-answer");
    out.spans = el.querySelectorAll(".ans-hint").length;
    out.words = [...el.querySelectorAll("span.hw")].map((x) => x.textContent);
    return out;
  });
  t("амер./брит. підписані обидва варіанти",
    reg.jewelry === "jewelry (амер.) / jewellery (брит.)", reg.jewelry);
  t("перевернута пара `cheque` підписана правильно",
    reg.cheque === "cheque (брит.) / check (амер.)", reg.cheque);
  t("чужа підказка на enAlt НЕ протікає", !/звірити/.test(reg.cheque), reg.cheque);
  t("явна підказка сильніша за автопозначку",
    /повне написання/.test(reg.doughnut) && !/\(амер\.\)/.test(reg.doughnut), reg.doughnut);
  t("несписаний синонім лишається без позначки",
    /mathematics/.test(reg.math) && !/mathematics \(/.test(reg.math), reg.math);
  t("лексичні синоніми НЕ позначаються як брит./амер.",
    reg.negative.length === 0, reg.negative.join(", "));
  t("позначку дістає весь клас пар, а не одна картка", reg.marked > 100, String(reg.marked));
  t("позначки — окремими блідими спанами", reg.spans === 2, String(reg.spans));
  t("слова лишились клікабельні без дужки",
    reg.words.includes("jewelry") && reg.words.includes("jewellery"), reg.words.join("|"));

  // 4. слово без підказки — рядок як раніше
  const plain = await page.evaluate(() => {
    const idx = WORDS.findIndex((w) => (Array.isArray(w.en) ? w.en[0] : w.en) === "resin");
    currentWordIndex = idx; currentWord = WORDS[idx]; mode = "en-ua"; currentShown = "resin";
    const ans = getCorrectAnswer();
    showCorrection(ans);
    return { ans, hints: document.querySelectorAll("#correction-answer .ans-hint").length };
  });
  t("без HINTS рядок без дужок", plain.hints === 0 && !plain.ans.includes("("), plain.ans);

  // 5. промпт гри чистий: підказки не видно ДО відповіді
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForTimeout(800);
  await page.click("#start-btn").catch(() => {});
  await page.waitForTimeout(600);
  const prompt = await page.evaluate(() => {
    const el = document.getElementById("word-display");
    return el ? el.textContent : "";
  });
  t("промпт без дужок-підказок", !/\(/.test(prompt), prompt);

  // ── СЕСІЯ 45: підказка належить КАРТЦІ, а не англійському слову ──────────────
  // Слова-пари (tip=чайові/порада, hot=гарячий/гострий…) ключуються «en:ua»;
  // голий ключ для них ігнорується, бо підказка одного сенсу на другому бреше.
  const card = await page.evaluate(() => {
    const set = (en, ua, dir) => {
      const i = WORDS.findIndex(w => getEn(w)[0] === en && getUa(w)[0] === ua);
      currentWordIndex = i; currentWord = WORDS[i]; mode = dir;
      currentShown = dir === "en-ua" ? getEn(currentWord)[0] : getUa(currentWord)[0];
      return getCorrectAnswer();
    };
    return {
      tipPorada:  set("tip","порада","en-ua"),
      tipChaiovi: set("tip","чайові","en-ua"),
      hotHostryi: set("hot","гострий","en-ua"),
      hotGaryachyi: set("hot","гарячий","en-ua"),
      coolKrutyi: set("cool","крутий","en-ua"),
      coolProkh:  set("cool","прохолодний","en-ua"),
      uaEnPorada: set("tip","порада","ua-en"),
      uaEnChaiovi:set("tip","чайові","ua-en"),
      bareIgnored: hintFor("tip", "неіснуючий глос"),   // пара без точного ключа → порожньо
      plainStill:  hintFor("difficult", "складний"),    // непарне слово працює як раніше
    };
  });
  t("US→UA: «порада» отримує свою підказку", /порада \(практична підказка\)/.test(card.tipPorada), card.tipPorada);
  t("US→UA: «чайові» БЕЗ чужої підказки", !/\(/.test(card.tipChaiovi), card.tipChaiovi);
  t("US→UA: «гострий» отримує свою підказку", /пекучий на смак/.test(card.hotHostryi), card.hotHostryi);
  t("US→UA: «гарячий» БЕЗ чужої підказки", !/\(/.test(card.hotGaryachyi), card.hotGaryachyi);
  t("US→UA: «крутий» БЕЗ «приємно прохолодний»", !/прохолодн/.test(card.coolKrutyi), card.coolKrutyi);
  t("US→UA: «прохолодний» свою підказку зберіг", /приємно прохолодний/.test(card.coolProkh), card.coolProkh);
  t("UA→US: «порада» → tip з підказкою", /tip \(практична підказка\)/.test(card.uaEnPorada), card.uaEnPorada);
  t("UA→US: «чайові» → tip без підказки", /^tip$/.test(card.uaEnChaiovi.trim()), card.uaEnChaiovi);
  t("голий ключ слова-пари ігнорується", card.bareIgnored === "", card.bareIgnored);
  t("непарне слово підказку не втратило", card.plainStill.length > 0, card.plainStill);

  // ⚠️ ДУЖКИ В ТЕКСТІ ПІДКАЗКИ (сесія 50, привід «jealousy»). Гра рендерить підказку
  // САМА ЯК дужку і розбирає її регексом `^(.+?)\s*\(([^)]+)\)$`. Дужка всередині
  // підказки дає «jealousy (страх утратити своє (ревнощі))» — регекс не матчиться,
  // весь рядок падає в ОДИН спан: підказка не тьмяніє, слово втрачає hover/IPA/озвучку.
  // Регекс розширити не можна (мусить брати ОСТАННЮ групу), тому інваріант — на даних.
  // Вхід стереже `hints-add.js`; тут ловимо ручні правки dict.js.
  const hp = await page.evaluate(() => {
    const bad = Object.entries(HINTS).filter(([, v]) => /[()]/.test(v)).map(([k, v]) => k + " → " + v);
    // і рендер: підказка мусить жити в окремому тьмяному спані
    const i = WORDS.findIndex(w => (Array.isArray(w.en) ? w.en[0] : w.en) === "jealousy");
    currentWordIndex = i; currentWord = WORDS[i]; mode = "ua-en";
    currentShown = (Array.isArray(currentWord.ua) ? currentWord.ua[0] : currentWord.ua);
    const html = wrapEnWord(getCorrectAnswer());
    return { bad, html, nested: /\([^)]*\(/.test(getCorrectAnswer()) };
  });
  t("жодна підказка НЕ містить дужок", hp.bad.length === 0, hp.bad.join(" | "));
  t("«ревнощі»: підказка не вкладена в дужку", hp.nested === false);
  t("«ревнощі»: слово окремим .hw-спаном", /<span class="hw"[^>]*>jealousy<\/span>/.test(hp.html), hp.html);
  t("«ревнощі»: підказка окремим .ans-hint", /<span class="ans-hint">\(страх утратити своє\)<\/span>/.test(hp.html), hp.html);

  // ⚠️ ТАВТОЛОГІЧНІ ПІДКАЗКИ (сесія 50, привід «fortunately = на щастя (на щастя)»).
  // Правило HINTS: підказка пишеться ЛИШЕ коли за той самий укр. глос конкурує інше
  // англ. слово. Немає конкурента → підказки не має бути взагалі; є → вона мусить
  // РОЗРІЗНЯТИ, а не переписувати глос. Вхід стереже `hints-add.js`, тут — ручні правки.
  const taut = await page.evaluate(() => {
    const arr = (x) => (Array.isArray(x) ? x : [x]);
    const norm = (x) => String(x).replace(/\s*\([^)]*\)/g, "").trim().toLowerCase();
    const byKey = new Map();
    WORDS.forEach((w) => { const k = arr(w.en)[0]; if (!byKey.has(k)) byKey.set(k, w); });
    const bad = [];
    for (const [k, hint] of Object.entries(HINTS)) {
      const gloss = k.includes(":") ? k.split(":").slice(1).join(":")
                                    : (byKey.get(k) || {}).ua;
      if (gloss && norm(arr(gloss)[0]) === norm(hint)) bad.push(k + " → " + hint);
    }
    return bad;
  });
  t("жодна підказка не дублює власний глос", taut.length === 0, taut.slice(0, 6).join(" | "));

  console.log("✅ " + ok.length + " перевірок пройдено");
  if (bad.length) console.log("❌ ПРОВАЛЕНО:\n - " + bad.join("\n - "));
  console.log(errors.length ? "❌ помилки консолі:\n - " + errors.slice(0, 5).join("\n - ") : "✅ 0 помилок консолі");
  await browser.close();
  process.exit(bad.length || errors.length ? 1 : 0);
})();
