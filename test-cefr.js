// Браузерний тест фічі «Рівні CEFR» (сесія 42) — реальний Chromium, реальний index.html.
//
// Запуск:
//   npm i playwright-core          (драйвер; Chromium уже лежить у /opt/pw-browsers)
//   node test-cefr.js
// Якщо playwright-core стоїть в іншій теці — передай її через PW_CORE:
//   PW_CORE=/шлях/до/node_modules/playwright-core node test-cefr.js
//
// ~30 перевірок: вибір рівнів у модалці «Тренування», лічильники, пул гри, підписи тегів,
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

  // 1. рівні живуть у модалці «Тренування» (сесія 44: окремої кнопки/модалки CEFR нема)
  t("старої кнопки #cefr-btn нема", await page.$("#cefr-btn") === null);
  t("старої модалки #cefr-modal нема", await page.$("#cefr-modal") === null);
  await page.click("#start-btn");
  t("модалка «Тренування» відкрилась", await page.isVisible("#train-modal"));
  const sets = await page.$$eval(".tm-set", bs => bs.map(b => b.dataset.set));
  t("CEFR перший у списку наборів", sets[0] === "cefr", sets.join(","));
  t("рядок рівнів видно", await page.isVisible("#tm-levels"));
  // число рівня живе окремим спаном .lvn (сесія 44, редизайн модалки)
  const chips = await page.$$eval("#tm-levels button", bs => bs.map(b => +b.querySelector(".lvn").textContent));
  t("7 рівнів (A1-C2 + без рівня)", chips.length === 7, String(chips.length));
  const sum = chips.reduce((a, c) => a + c, 0);
  const words = await page.evaluate(() => WORDS.length);
  t("сума лічильників = WORDS", sum === words, sum + " vs " + words);

  // 2. тогл рівня зберігається, пул відповідає вибору
  await page.click('#tm-levels button[data-lv="C2"]');
  const stored = await page.evaluate(() => localStorage.getItem("oxford_cefr_sel_v1"));
  t("вибір рівнів збережено", !!stored && stored.includes("C2"), String(stored));
  const poolCheck = await page.evaluate(() => {
    cefrSel = new Set(["C2"]);
    const pool = cefrIndices([...cefrSel]);
    return { n: pool.length, allC2: pool.every(i => cefrLevelOf(WORDS[i]) === "C2") };
  });
  t("пул = слова обраного рівня", poolCheck.allC2 && poolCheck.n > 0, JSON.stringify(poolCheck));

  // 3. Esc закриває; гра стартує з обраного набору й напрямку
  await page.keyboard.press("Escape");
  t("Esc закриває «Тренування»", await page.isHidden("#train-modal"));
  const started = await page.evaluate(() => {
    trainSet = "cefr"; trainDir = "ua-en"; cefrSel = new Set(["C2"]);
    startTraining();
    const r = { lvl: typeof currentWord === "object" ? cefrLevelOf(currentWord) : "?",
                tag: timedPoolTag, m: mode, activePool };
    endGame(true);
    return r;
  });
  t("слово в грі — з обраного рівня", started.lvl === "C2", JSON.stringify(started));
  t("тег рівня для лідерборду", started.tag === "cefr:C2", String(started.tag));
  t("напрямок узято з модалки", started.m === "ua-en", String(started.m));
  t("гра НЕ review (mastery оновлюється)", started.activePool === null);

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

  // Підпис рівня і відсутність номера місця для CEFR-рядка.
  // ⚠️ ДАТА ТУТ ЖИВА, а не пінована TODAY="2026-08-05" (сесія 45, фікс гнилої перевірки):
  // рядок «остання гра» рендериться ЛИШЕ коли `latest.key === todayKey()`, тож із
  // фіксованою датою обидві перевірки проходили рівно один день і потім давали null.
  // Пінування лишається доречним ВИЩЕ — там тестується міграція `oxford_fix_cefr_lb_v1`,
  // яка сама зашита на 05.08.2026. Ключ беремо з `todayKey()` САМОЇ ГРИ, а не рахуємо в
  // Node: так він гарантовано збігається з тим, що порівнює `renderLeaderboard`
  // (локальні частини дати, не UTC).
  await page.evaluate(() => {
    localStorage.setItem("oxford_latest_v1", JSON.stringify({
      key: todayKey(), score: 16, wrong: 2, skipped: 1, mode: "en-ua", ts: Date.now(),
      wordCount: 7789, tag: "cefr:A1",
    }));
  });
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
    trainSet = "cefr"; cefrSel = new Set(["A1", "A2"]);
    startTraining();
    const t = timedPoolTag; endGame(true); return t;
  });
  t("гра за рівнями ставить тег", tag === "cefr:A1+A2", String(tag));

  console.log("✅ " + ok.length + " перевірок пройдено");
  if (bad.length) console.log("❌ ПРОВАЛЕНО:\n - " + bad.join("\n - "));
  console.log(errors.length
    ? "❌ помилки консолі:\n - " + errors.slice(0, 5).join("\n - ")
    : "✅ 0 помилок консолі");
  await browser.close();
  process.exit(bad.length || errors.length ? 1 : 0);
})();
