// Браузерний тест вкладки 🕒 «Рекорди за останній період» (сесія 51) —
// реальний Chromium, реальний index.html.
//
// Запуск:
//   npm i playwright-core          (драйвер; Chromium уже лежить у /opt/pw-browsers)
//   node test-lb-period.js
//
// Покриває:
//   • вікна періодів: 7/30 днів (від ПОЧАТКУ дня, не «мінус N×24 год»),
//     календарний місяць, останні N ігор;
//   • сортування (рахунок ↓, помилки ↑) і кап топ-10;
//   • CEFR-ігри ВХОДЯТЬ і підписані своїм пулом — на відміну від вкладки 🏆;
//   • персист вибору в oxford_lb_period_v1 і що це НЕ ключ бекапу;
//   • чипси не течуть на чужі вкладки, кошик-reset тут схований;
//   • Tab-цикл містить нову вкладку; порожній період дає підказку.
// У verify.sh НЕ входить (потрібен зовнішній драйвер).

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
  await page.waitForTimeout(1000);

  // Засів журналу ігор. Дати рахуємо В БРАУЗЕРІ від його ж «сьогодні», інакше тест
  // ламався б на межі доби або в іншій таймзоні, ніж у node.
  await page.evaluate(() => {
    localStorage.clear();
    const startOfDay = (back) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - back); return d.getTime(); };
    const g = (score, wrong, back, extra) => Object.assign(
      { score, wrong, skipped: 0, mode: "en-ua", ts: startOfDay(back), wordCount: 13700 }, extra || {});
    const log = [
      g(30, 0, 400),                       // давня — поза всіма вікнами, крім «за N ігор»
      g(25, 2, 45),                        // > 30 днів
      g(20, 1, 20),                        // у 30 днів, поза 7
      g(18, 0, 3),                         // у 7 днів
      g(18, 5, 2),                         // той самий рахунок, більше помилок → нижче
      g(14, 1, 1, { tag: "cefr:A1" }),     // CEFR — має ВХОДИТИ і бути підписаною
      g(9, 0, 0),                          // сьогодні
    ];
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(log));
  });
  await page.reload();
  await page.waitForTimeout(900);

  const openTab = async (tab) => {
    await page.evaluate((tb) => {
      document.getElementById("leaderboard").classList.remove("hidden");
      document.querySelector('.lb-tab[data-tab="' + tb + '"]').click();
    }, tab);
    await page.waitForTimeout(120);
  };
  const read = () => page.evaluate(() => ({
    title: document.getElementById("lb-title").textContent,
    rows: [...document.querySelectorAll("#lb-list li")].map((li) => li.textContent),
    chips: [...document.querySelectorAll("#lb-period-chips .lb-chip")].map((c) => c.textContent),
    active: (document.querySelector("#lb-period-chips .lb-chip.active") || {}).textContent,
    sum: (document.querySelector(".lb-per-sum") || {}).textContent || "",
    chipsHidden: document.getElementById("lb-period-chips").classList.contains("hidden"),
    resetHidden: document.getElementById("lb-reset").style.visibility === "hidden",
    empty: document.getElementById("lb-empty").classList.contains("hidden")
      ? "" : document.getElementById("lb-empty").textContent,
  }));

  // 1. вкладка існує, відкривається, дефолт — 30 днів
  await openTab("period");
  let v = await read();
  t("вкладка 🕒 існує", (await page.$('.lb-tab[data-tab="period"]')) !== null);
  t("заголовок про період", /Рекорди за період/.test(v.title), v.title);
  t("дефолтний період — 30 днів", v.active === "30 днів", String(v.active));
  t("п'ять варіантів періоду", v.chips.length === 5, v.chips.join("|"));
  t("кошик-reset схований", v.resetHidden);

  // 2. вікно «30 днів»: без давніх ігор (400 і 45 днів тому)
  t("30 днів: 5 ігор", v.rows.length === 5, String(v.rows.length));
  t("30 днів: без гри 45-денної давнини", !v.rows.some((r) => /^25/.test(r)), v.rows.join(" | "));
  t("30 днів: підсумок рахує саме їх", /^5 ігор/.test(v.sum), v.sum);

  // 3. сортування: рівний рахунок → менше помилок вище
  const idx18 = v.rows.map((r, i) => [r, i]).filter(([r]) => /^18/.test(r)).map(([, i]) => i);
  t("рівний рахунок: менше помилок вище", idx18.length === 2 && idx18[0] < idx18[1], JSON.stringify(idx18));
  t("найкраща гра періоду — перша", /^20/.test(v.rows[0]), v.rows[0]);

  // 4. CEFR-гра входить і підписана пулом (на 🏆 вона б не з'явилась)
  t("CEFR-гра входить у період", v.rows.some((r) => /🎓 A1/.test(r)), v.rows.join(" | "));

  // 5. «7 днів» — вужче вікно
  await page.click('#lb-period-chips .lb-chip[data-per="d7"]');
  await page.waitForTimeout(120);
  v = await read();
  t("7 днів: лишились 4 ігри", v.rows.length === 4, String(v.rows.length));
  t("7 днів: гра 20-денної давнини випала", !v.rows.some((r) => /^20/.test(r)), v.rows.join(" | "));
  t("7 днів: заголовок оновився", /останні 7 днів/.test(v.title), v.title);

  // 6. «500 ігор» — рахунок, а не час: давня гра повертається
  await page.click('#lb-period-chips .lb-chip[data-per="g500"]');
  await page.waitForTimeout(120);
  v = await read();
  t("500 ігор: усі 7 ігор журналу", v.rows.length === 7, String(v.rows.length));
  t("500 ігор: давня гра на 30 — перша", /^30/.test(v.rows[0]), v.rows[0]);

  // 7. персист вибору між перезавантаженнями
  await page.reload();
  await page.waitForTimeout(900);
  await openTab("period");
  v = await read();
  t("вибір періоду переживає reload", v.active === "500 ігор", String(v.active));
  const inBackup = await page.evaluate(() => BACKUP_KEYS.includes("oxford_lb_period_v1"));
  t("ключ періоду НЕ в BACKUP_KEYS (UI-налаштування)", inBackup === false);

  // 8. чипси не течуть на чужі вкладки
  await openTab("games");
  v = await read();
  t("на 🏆 чипси сховані", v.chipsHidden);
  t("на 🏆 кошик повернувся", !v.resetHidden);
  await openTab("period");
  t("назад на 🕒 чипси видно", !(await read()).chipsHidden);

  // 9. Tab-цикл містить нову вкладку
  const cycle = await page.evaluate(async () => {
    document.querySelector('.lb-tab[data-tab="cefr"]').click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    return lbActiveTab;
  });
  t("Tab із 🎓 веде на 🕒", cycle === "period", cycle);

  // 10. кап топ-10 і порожній період
  await page.evaluate(() => {
    const now = Date.now();
    const log = Array.from({ length: 25 }, (_, i) =>
      ({ score: i, wrong: 0, skipped: 0, mode: "en-ua", ts: now - i * 60000, wordCount: 13700 }));
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(log));
    localStorage.setItem("oxford_lb_period_v1", "d7");
  });
  await page.reload(); await page.waitForTimeout(900);
  await openTab("period");
  v = await read();
  t("показано не більше 10 рядків", v.rows.length === 10, String(v.rows.length));
  t("підсумок рахує ВСІ ігри періоду, не 10", /^25 ігор/.test(v.sum), v.sum);

  await page.evaluate(() => { localStorage.setItem("oxford_games_log_v1", "[]"); });
  await page.reload(); await page.waitForTimeout(900);
  await openTab("period");
  v = await read();
  t("порожній період — підказка, а не порожнеча", /ігор ще немає/.test(v.empty), v.empty);

  // 11. верстка чипсів у вузькій колонці лідерборду (420px) — не ріжуться і не
  // розповзаються на три поверхи. Той самий підхід, що в test-panel.js.
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(
      [{ score: 12, wrong: 1, skipped: 0, mode: "en-ua", ts: now, wordCount: 13700 }]));
  });
  await page.reload(); await page.waitForTimeout(900);
  await openTab("period");
  const box = await page.evaluate(() => {
    const el = document.getElementById("lb-period-chips");
    const chips = [...el.querySelectorAll(".lb-chip")];
    const tops = new Set(chips.map((c) => Math.round(c.getBoundingClientRect().top)));
    return { rows: tops.size, overflow: el.scrollWidth > el.clientWidth + 1,
             cut: chips.some((c) => c.scrollWidth > c.clientWidth + 1),
             width: Math.round(el.getBoundingClientRect().width) };
  });
  t("чипси не ріжуться підписом", !box.cut);
  t("чипси не виїжджають за колонку", !box.overflow, String(box.width));
  t("чипси лягають максимум у 2 ряди", box.rows <= 2, String(box.rows));

  console.log(bad.length ? "❌ ПРОВАЛЕНО:\n  " + bad.join("\n  ") : "✅ " + ok.length + " перевірок пройдено");
  console.log(errors.length ? "❌ помилки консолі:\n  " + errors.join("\n  ") : "✅ 0 помилок консолі");
  await browser.close();
  process.exit(bad.length || errors.length ? 1 : 0);
})();
