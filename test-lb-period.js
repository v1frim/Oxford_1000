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

  // 9. Порядок вкладок і Tab-цикл (сесія 51: 🕒 стоїть ПЕРЕД 🏆, за запитом)
  const order = await page.evaluate(() =>
    [...document.querySelectorAll(".lb-tab")].map(b => b.dataset.tab));
  t("порядок вкладок: 🕒 · 🎓 · 🏆 · далі як було",
    order.slice(0, 3).join(",") === "period,cefr,games", order.join(","));
  const cycle = await page.evaluate(() => {
    document.querySelector('.lb-tab[data-tab="period"]').click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    return lbActiveTab;
  });
  t("Tab із 🕒 веде на 🎓", cycle === "cefr", cycle);

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
  // ⚠️ Рахуємо саме РЕЙТИНГОВІ рядки: `.lb-sep` і рядок «ост» під рискою в кап не входять
  // (той самий устрій, що в «Найкращих іграх»).
  const topRows = await page.evaluate(() =>
    document.querySelectorAll("#lb-list li:not(.lb-sep):not(.lb-latest)").length);
  t("показано не більше 10 рейтингових рядків", topRows === 10, String(topRows));
  t("підсумок рахує ВСІ ігри періоду, не 10", /^25 ігор/.test(v.sum), v.sum);

  // 10б. ОСТАННЯ ГРА ПЕРІОДУ під рискою (сесія 51). У цьому засіві найновіша гра має
  // найгірший рахунок (score 0, ts найбільший), тож у топ-10 вона не потрапляє.
  const tail = await page.evaluate(() => {
    const lis = [...document.querySelectorAll("#lb-list li")];
    const sep = lis.findIndex(li => li.classList.contains("lb-sep"));
    const last = lis[lis.length - 1];
    return { sep, cls: last.className, rank: last.getAttribute("data-rank"),
             title: last.getAttribute("title"), text: last.textContent, n: lis.length };
  });
  t("є риска-роздільник перед останньою грою", tail.sep === 10, String(tail.sep));
  t("рядок останньої гри має клас lb-latest", /lb-latest/.test(tail.cls), tail.cls);
  t("номер місця — за період, не глобальний", tail.rank === "25", String(tail.rank));
  t("tooltip пояснює, що місце за період", /за цей період/.test(tail.title || ""), String(tail.title));

  // 10в. якщо остання гра ВЖЕ в топ-10 — дубля під рискою НЕ додаємо, лише підсвітка
  await page.evaluate(() => {
    const now = Date.now();
    const log = Array.from({ length: 6 }, (_, i) =>
      ({ score: 5 + i, wrong: 0, skipped: 0, mode: "en-ua", ts: now - (5 - i) * 60000, wordCount: 13700 }));
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(log));
    const best = log[log.length - 1];
    localStorage.setItem("oxford_latest_v1", JSON.stringify(
      Object.assign({ key: new Date().toISOString().slice(0, 10) }, best)));
  });
  await page.reload(); await page.waitForTimeout(900);
  await openTab("period");
  const inTop = await page.evaluate(() => {
    const lis = [...document.querySelectorAll("#lb-list li")];
    return { n: lis.length, sep: lis.some(li => li.classList.contains("lb-sep")),
             hi: lis.filter(li => li.classList.contains("is-latest-game")).length };
  });
  t("остання гра в топі — без дубля під рискою", inTop.n === 6 && !inTop.sep, JSON.stringify(inTop));
  t("остання гра в топі підсвічена синьою рискою", inTop.hi === 1, String(inTop.hi));

  // 10г. остання гра CEFR теж дістає номер місця (rankAnyPool), хоч на 🏆 його б не було
  await page.evaluate(() => {
    const now = Date.now();
    const log = Array.from({ length: 11 }, (_, i) =>
      ({ score: 20 - i, wrong: 0, skipped: 0, mode: "en-ua", ts: now - (20 - i) * 60000, wordCount: 13700 }));
    log.push({ score: 2, wrong: 3, skipped: 0, mode: "en-ua", ts: now, wordCount: 13700, tag: "cefr:A1" });
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(log));
    localStorage.removeItem("oxford_latest_v1");
  });
  await page.reload(); await page.waitForTimeout(900);
  await openTab("period");
  const cefrTail = await page.evaluate(() => {
    const last = [...document.querySelectorAll("#lb-list li")].pop();
    return { rank: last.getAttribute("data-rank"), text: last.textContent };
  });
  t("остання CEFR-гра має номер місця за період", cefrTail.rank === "12", String(cefrTail.rank));
  t("остання CEFR-гра підписана своїм пулом", /🎓 A1/.test(cefrTail.text), cefrTail.text);

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

  // 12. Shift у МЕНЮ гортає період, а НЕ відкриває «Тренування» (сесія 51, за запитом).
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(
      [{ score: 12, wrong: 1, skipped: 0, mode: "en-ua", ts: now, wordCount: 13700 }]));
    localStorage.setItem("oxford_lb_period_v1", "d7");
  });
  await page.reload(); await page.waitForTimeout(900);
  await openTab("games");                       // навмисно з ЧУЖОЇ вкладки
  await page.keyboard.press("Shift"); await page.waitForTimeout(150);
  let st = await page.evaluate(() => ({ tab: lbActiveTab, per: lbPeriod,
    modal: !document.getElementById("train-modal").classList.contains("hidden") }));
  t("Shift не відкриває «Тренування» з меню", st.modal === false);
  t("перший Shift лише переводить на 🕒", st.tab === "period" && st.per === "d7", JSON.stringify(st));

  await page.keyboard.press("Shift"); await page.waitForTimeout(150);
  st = await page.evaluate(() => ({ per: lbPeriod, active: document.querySelector("#lb-period-chips .lb-chip.active").textContent }));
  t("другий Shift гортає період уперед", st.per === "d30", JSON.stringify(st));
  t("активний чипс перемалювався", st.active === "30 днів", st.active);

  const stored = await page.evaluate(() => localStorage.getItem("oxford_lb_period_v1"));
  t("гортання зберігається у localStorage", stored === "d30", String(stored));

  // коло замикається: d30 → month → g100 → g500 → d7
  const seq = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Shift"); await page.waitForTimeout(120);
    seq.push(await page.evaluate(() => lbPeriod));
  }
  t("лівий Shift іде вперед і замикає коло", seq.join(",") === "month,g100,g500,d7", seq.join(","));

  // ⚠️ ПРАВИЙ Shift — назад (сесія 51, прямий вибір користувача). Playwright'ів
  // `press("Shift")` шле саме ShiftLeft, тож правий тиснемо явно через down/up.
  const back = [];
  for (let i = 0; i < 2; i++) {
    await page.keyboard.down("ShiftRight"); await page.keyboard.up("ShiftRight");
    await page.waitForTimeout(120);
    back.push(await page.evaluate(() => lbPeriod));
  }
  t("правий Shift гортає назад", back.join(",") === "g500,g100", back.join(","));

  // Enter із меню й далі відкриває «Тренування», Shift усередині — напрямок
  const perBeforeModal = await page.evaluate(() => lbPeriod);
  await page.keyboard.press("Enter"); await page.waitForTimeout(200);
  t("Enter відкриває «Тренування»", await page.isVisible("#train-modal"));
  const dir1 = await page.evaluate(() => trainDir);
  await page.keyboard.press("Shift"); await page.waitForTimeout(150);
  const dir2 = await page.evaluate(() => trainDir);
  t("Shift у модалці перемикає напрямок", dir1 !== dir2, dir1 + " → " + dir2);
  t("період у модалці НЕ гортається",
    await page.evaluate(() => lbPeriod) === perBeforeModal, perBeforeModal);
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);

  // 13. Shift працює і НА ЕКРАНІ РЕЗУЛЬТАТІВ (сесія 51, за запитом), а під час самої
  // гри — НІ (там Shift озвучує слово, чіпати цю роль не можна).
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(
      [{ score: 12, wrong: 1, skipped: 0, mode: "en-ua", ts: now, wordCount: 13700 }]));
    localStorage.setItem("oxford_lb_period_v1", "d7");
  });
  await page.reload(); await page.waitForTimeout(900);
  await openTab("period");

  // під час гри Shift період НЕ чіпає
  await page.evaluate(() => {
    startScreen.classList.add("hidden");
    endScreen.classList.add("hidden");
    gameEl.classList.remove("hidden");
  });
  await page.keyboard.press("Shift"); await page.waitForTimeout(150);
  t("під час гри Shift період не гортає", await page.evaluate(() => lbPeriod) === "d7",
    await page.evaluate(() => lbPeriod));

  // на екрані результатів — гортає
  await page.evaluate(() => {
    gameEl.classList.add("hidden");
    endScreen.classList.remove("hidden");
  });
  await page.keyboard.press("Shift"); await page.waitForTimeout(150);
  t("на екрані результатів Shift гортає вперед",
    await page.evaluate(() => lbPeriod) === "d30", await page.evaluate(() => lbPeriod));
  await page.keyboard.down("ShiftRight"); await page.keyboard.up("ShiftRight");
  await page.waitForTimeout(150);
  t("на екрані результатів правий Shift гортає назад",
    await page.evaluate(() => lbPeriod) === "d7", await page.evaluate(() => lbPeriod));
  t("чипси на фіналі перемальовані",
    await page.evaluate(() => (document.querySelector("#lb-period-chips .lb-chip.active") || {}).textContent) === "7 днів");

  // 14. ПІДПИСИ ПУЛІВ (сесія 51, баг знайшов користувач: «🎓 цей значок означає, так
  // розумію, що це були повторення»). Тег `wrong` («не дались») до фіксу йшов тією ж
  // гілкою, що CEFR, і давав `"wrong".slice(5)` === "" → голий «🎓 ·  дата».
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem("oxford_games_log_v1", JSON.stringify([
      { score: 9, wrong: 0, skipped: 0, mode: "en-ua", ts: now - 4e5, wordCount: 13700, tag: "wrong" },
      { score: 8, wrong: 0, skipped: 0, mode: "en-ua", ts: now - 3e5, wordCount: 13700, tag: "cefr:A1" },
      { score: 7, wrong: 0, skipped: 0, mode: "en-ua", ts: now - 2e5, wordCount: 13700, tag: "learning" },
      { score: 6, wrong: 0, skipped: 0, mode: "en-ua", ts: now - 1e5, wordCount: 13700 },
    ]));
    localStorage.setItem("oxford_lb_period_v1", "d7");
  });
  await page.reload(); await page.waitForTimeout(900);
  await openTab("period");
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll("#lb-list li .lb-mode")].map((e) => e.textContent));
  t("пул «не дались» підписаний 🔁, а не голим 🎓",
    labels.some((l) => /🔁 Не дались/.test(l)) && !labels.some((l) => /^🎓 ·/.test(l)),
    labels.join(" | "));
  t("CEFR-гра підписана рівнем", labels.some((l) => /🎓 A1/.test(l)), labels.join(" | "));
  t("пул «Вивчаю» підписаний своїм значком", labels.some((l) => /↗ Вивчаю/.test(l)), labels.join(" | "));
  t("звичайна гра підписана напрямком", labels.some((l) => /US→UA|UA→US/.test(l)), labels.join(" | "));

  console.log(bad.length ? "❌ ПРОВАЛЕНО:\n  " + bad.join("\n  ") : "✅ " + ok.length + " перевірок пройдено");
  console.log(errors.length ? "❌ помилки консолі:\n  " + errors.join("\n  ") : "✅ 0 помилок консолі");
  await browser.close();
  process.exit(bad.length || errors.length ? 1 : 0);
})();
