// Браузерний тест фічі «Рівні CEFR» (сесія 42) — реальний Chromium, реальний index.html.
//
// Запуск:
//   npm i playwright-core          (драйвер; Chromium уже лежить у /opt/pw-browsers)
//   node test-cefr.js
// Якщо playwright-core стоїть в іншій теці — передай її через PW_CORE:
//   PW_CORE=/шлях/до/node_modules/playwright-core node test-cefr.js
//
// 30 перевірок: модалка вибору рівнів, лічильники, пул гри, підписи тегів,
// правила лідерборду для CEFR-ігор + одноразова міграція oxford_fix_cefr_lb_v1.
// У verify.sh НЕ входить (потрібен зовнішній драйвер) — ганяти вручну після
// змін у блоці CEFR або в лідерборді.

const fs = require("fs");
const path = require("path");

const PAGE = "file://" + path.join(__dirname, "index.html");
const BROWSERS = "/opt/pw-browsers";

function loadChromium() {
  const tries = [process.env.PW_CORE, "playwright-core"].filter(Boolean);
  for (const t of tries) {
    try { return require(t).chromium; } catch (e) { /* далі */ }
  }
  console.log("⚠️  playwright-core не знайдено. Постав його:  npm i playwright-core");
  console.log("   (або вкажи наявний: PW_CORE=/шлях/до/node_modules/playwright-core node test-cefr.js)");
  process.exit(2);
}

function chromePath() {
  const dir = fs.existsSync(BROWSERS)
    ? fs.readdirSync(BROWSERS).find((d) => /^chromium-\d/.test(d))
    : null;
  if (!dir) {
    console.log("⚠️  Chromium не знайдено в " + BROWSERS + " — тест потребує браузера.");
    process.exit(2);
  }
  return path.join(BROWSERS, dir, "chrome-linux", "chrome");
}

(async () => {
  const chromium = loadChromium();
  const browser = await chromium.launch({ executablePath: chromePath(), args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  const ok = [], bad = [];
  const t = (name, cond, extra = "") => (cond ? ok : bad).push(name + (extra ? " — " + extra : ""));

  // ─────────────────────────────────────────────────────────────────
  // ЧАСТИНА 1. Модалка рівнів і пул гри
  // ─────────────────────────────────────────────────────────────────
  await page.goto(PAGE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1200);

  t("кнопка #cefr-btn видима", await page.isVisible("#cefr-btn"));
  await page.click("#cefr-btn");
  t("модалка відкрилась", await page.isVisible("#cefr-modal"));

  const rows = await page.$$eval(".cefr-row", (rs) => rs.map((r) => ({
    lv: r.dataset.lv,
    on: r.classList.contains("on"),
    n: +r.querySelector(".cefr-count").textContent,
  })));
  t("7 рядків рівнів", rows.length === 7, "маємо " + rows.length);
  const sum = rows.reduce((s, r) => s + r.n, 0);
  const words = await page.evaluate(() => WORDS.length);
  t("сума лічильників = WORDS", sum === words, sum + " vs " + words);
  const on = rows.filter((r) => r.on).map((r) => r.lv).join(",");
  t("дефолт B1+B2 позначені", on === "B1,B2", on);

  const expectSel = rows.filter((r) => r.on).reduce((s, r) => s + r.n, 0);
  const label = await page.textContent("#cefr-play");
  t("лічильник на кнопці = сумі обраних", label.includes(String(expectSel)), label);

  await page.click('.cefr-row[data-lv="A1"]');
  const label2 = await page.textContent("#cefr-play");
  const a1 = rows.find((r) => r.lv === "A1").n;
  t("тогл A1 змінив лічильник", label2.includes(String(expectSel + a1)), label2);
  const stored = await page.evaluate(() => localStorage.getItem("oxford_cefr_sel_v1"));
  t("вибір збережено в localStorage", stored && stored.includes("A1"), String(stored));

  for (const lv of ["A1", "B1", "B2"]) await page.click('.cefr-row[data-lv="' + lv + '"]');
  t("кнопка блокується без вибору", await page.isDisabled("#cefr-play"));

  // пул рівня: беремо C2 — там найменше слів
  await page.click('.cefr-row[data-lv="C2"]');
  const poolCheck = await page.evaluate(() => {
    const pool = cefrIndices([...cefrSel]);
    return { n: pool.length, allC2: pool.every((i) => cefrLevelOf(WORDS[i]) === "C2") };
  });
  t("пул = слова обраного рівня", poolCheck.allC2 && poolCheck.n > 0, JSON.stringify(poolCheck));

  // Esc перевіряємо ДО старту гри — під час гри меню сховане
  await page.keyboard.press("Escape");
  t("Esc закриває модалку рівнів", await page.isHidden("#cefr-modal"));
  await page.click("#cefr-btn");
  t("модалка відкривається повторно", await page.isVisible("#cefr-modal"));

  await page.click("#cefr-play");
  t("модалка напрямку відкрилась", await page.isVisible("#review-mode-modal"));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  t("гра стартувала", await page.isVisible("#game"));
  const inGame = await page.evaluate(() => ({
    lvl: typeof currentWord === "object" ? cefrLevelOf(currentWord) : "?",
    activePool: activePool,
  }));
  t("слово в грі — з обраного рівня", inGame.lvl === "C2", JSON.stringify(inGame));
  t("гра НЕ review (mastery оновлюється)", inGame.activePool === null, JSON.stringify(inGame));

  // підписи тегів
  const labels = await page.evaluate(() => ({
    one: cefrTagLabel(new Set(["A1"])),
    range: cefrTagLabel(new Set(["A1", "A2", "B1"])),
    gap: cefrTagLabel(new Set(["A1", "C2"])),
    none: cefrTagLabel(new Set(["none"])),
  }));
  t("підпис одного рівня", labels.one === "A1", labels.one);
  t("підпис діапазону", labels.range === "A1-B1", labels.range);
  t("підпис із розривом", labels.gap === "A1+C2", labels.gap);
  t("підпис кошика без рівня", labels.none === "—", labels.none);

  // ─────────────────────────────────────────────────────────────────
  // ЧАСТИНА 2. Лідерборд: CEFR-ігри поза топ-10 + міграція
  // ─────────────────────────────────────────────────────────────────
  const TODAY = "2026-08-05";                       // день скарги користувача
  const tsToday = new Date(TODAY + "T12:00:00").getTime();
  const tsNormal = new Date(TODAY + "T09:00:00").getTime();

  // сіємо стан ДО міграції: та сама «легка» гра 16 нагорі + звичайна гра 12
  await page.evaluate(([tsC, tsN, day]) => {
    localStorage.clear();
    const bad = { score: 16, wrong: 2, skipped: 1, mode: "en-ua", ts: tsC, wordCount: 7789, id: 1 };
    const good = { score: 12, wrong: 3, skipped: 1, mode: "ua-en", ts: tsN, wordCount: 7789, id: 2 };
    localStorage.setItem("oxford_scores_v1", JSON.stringify([bad, good]));
    localStorage.setItem("oxford_games_log_v1", JSON.stringify([good, bad]));
    localStorage.setItem("oxford_latest_v1", JSON.stringify(Object.assign({ key: day }, bad)));
    localStorage.setItem("oxford_today_best_v1", JSON.stringify(Object.assign({ key: day }, bad)));
  }, [tsToday, tsNormal, TODAY]);

  await page.reload();
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => ({
    scores: JSON.parse(localStorage.getItem("oxford_scores_v1") || "[]"),
    log: JSON.parse(localStorage.getItem("oxford_games_log_v1") || "[]"),
    latest: localStorage.getItem("oxford_latest_v1"),
    todayBest: JSON.parse(localStorage.getItem("oxford_today_best_v1") || "null"),
    flag: localStorage.getItem("oxford_fix_cefr_lb_v1"),
  }));
  t("міграція прибрала гру 16 з топ-10", !after.scores.some((s) => s.score === 16),
     JSON.stringify(after.scores.map((s) => s.score)));
  t("звичайна гра 12 лишилась", after.scores.some((s) => s.score === 12));
  t("міграція прибрала її з games-log", !after.log.some((s) => s.score === 16));
  t("«остання гра» очищена", after.latest === null, String(after.latest));
  t("найкраща гра дня перерахована на 12", after.todayBest && after.todayBest.score === 12,
     JSON.stringify(after.todayBest));
  t("прапор міграції виставлено", after.flag === "1");

  // підпис рівня і відсутність номера місця для CEFR-рядка
  await page.evaluate(([ts, day]) => {
    localStorage.setItem("oxford_latest_v1", JSON.stringify({
      key: day, score: 16, wrong: 2, skipped: 1, mode: "en-ua", ts: ts + 60000,
      wordCount: 7789, tag: "cefr:A1",
    }));
  }, [tsToday, TODAY]);
  await page.reload();
  await page.waitForTimeout(1200);
  const row = await page.evaluate(() => {
    const li = [...document.querySelectorAll("#lb-list li")].find((x) => x.className.includes("lb-latest"));
    return li ? { mode: li.querySelector(".lb-mode").textContent, rank: li.getAttribute("data-rank") } : null;
  });
  t("рядок «остання гра» показує рівень", row && row.mode.includes("🎓 A1"), JSON.stringify(row));
  t("номер місця НЕ показується для CEFR-гри", row && row.rank === null, JSON.stringify(row));

  const normalRow = await page.evaluate(() => {
    const li = document.querySelector("#lb-list li");
    return li ? li.querySelector(".lb-mode").textContent : null;
  });
  t("звичайна гра підписана напрямком", normalRow && /UA|US/.test(normalRow), String(normalRow));

  // тег ставиться при старті гри
  const tag = await page.evaluate(() => {
    cefrSel = new Set(["A1", "A2"]);
    startCefrGame();
    const t = pendingCatTag;
    document.getElementById("review-mode-modal").classList.add("hidden");
    pendingCatPool = null; pendingCatTag = null;
    return t;
  });
  t("startCefrGame ставить тег рівнів", tag === "cefr:A1+A2", String(tag));

  console.log("✅ " + ok.length + " перевірок пройдено");
  if (bad.length) console.log("❌ ПРОВАЛЕНО:\n - " + bad.join("\n - "));
  console.log(errors.length
    ? "❌ помилки консолі:\n - " + errors.slice(0, 5).join("\n - ")
    : "✅ 0 помилок консолі");
  await browser.close();
  process.exit(bad.length || errors.length ? 1 : 0);
})();
