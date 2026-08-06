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
      return cards.length !== 1;
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

  console.log("✅ " + ok.length + " перевірок пройдено");
  if (bad.length) console.log("❌ ПРОВАЛЕНО:\n - " + bad.join("\n - "));
  console.log(errors.length ? "❌ помилки консолі:\n - " + errors.slice(0, 5).join("\n - ") : "✅ 0 помилок консолі");
  await browser.close();
  process.exit(bad.length || errors.length ? 1 : 0);
})();
