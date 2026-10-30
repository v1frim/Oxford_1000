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
  const browser = await loadChromium().launch({ executablePath: process.env.PW_CHROME || chromePath(), args: ["--no-sandbox"] });
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
      const btn = document.querySelector('.lb-tab[data-tab="' + tb + '"]');
      if (btn) btn.click(); else { lbActiveTab = tb; renderLeaderboard(); }   // 🏆 без кнопки з сесії 61
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
  // сесія 65: 🕒 і ⚔️ злито — дефолт «Походи», чипси рівно «Походи · Тиждень · Місяць · Рівні CEFR»
  t("дефолтний чипс — Походи", v.active === "Походи", String(v.active));
  t("чотири чипси: Походи · Тиждень · Місяць · Рівні CEFR", v.chips.join("|") === "Походи|Тиждень|Місяць|Рівні CEFR", v.chips.join("|"));
  t("на «Походах» — рейтинг походів", /Рекорди походів/.test(v.title), v.title);
  t("кошик-reset схований", v.resetHidden);
  await page.click('#lb-period-chips .lb-chip[data-per="d30"]');
  await page.waitForTimeout(120);
  v = await read();
  t("заголовок про період", /Рекорди за період/.test(v.title), v.title);

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

  // 6. «300 ігор» і «За весь час» прибрано (сесія 65)
  t("чипсів «300 ігор» / «За весь час» немає",
    !(await page.$('#lb-period-chips .lb-chip[data-per="all"]')) && !(await page.$('#lb-period-chips .lb-chip[data-per="g300"]')));

  // 7. персист вибору між перезавантаженнями
  await page.reload();
  await page.waitForTimeout(900);
  await openTab("period");
  v = await read();
  t("вибір періоду переживає reload", v.active === "Тиждень", String(v.active));
  const inBackup = await page.evaluate(() => BACKUP_KEYS.includes("oxford_lb_period_v1"));
  t("ключ періоду НЕ в BACKUP_KEYS (UI-налаштування)", inBackup === false);

  // 7б. МІГРАЦІЯ старого збереженого вибору (сесія 57): у localStorage лежить "g500",
  // якого в LB_PERIODS уже немає — без міграції вкладка мовчки падала б на «30 днів».
  await page.evaluate(() => localStorage.setItem("oxford_lb_period_v1", "all"));
  await page.reload();
  await page.waitForTimeout(900);
  await openTab("period");
  v = await read();
  t("збережений прибраний чипс («За весь час») → «Походи»", v.active === "Походи", String(v.active));
  await page.evaluate(() => localStorage.setItem("oxford_lb_period_v1", "d7"));

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
  // сесія 61: 🏆 прибрано; анти-топ ⏸️ — після 🔥 серій (за запитом)
  t("порядок вкладок: ⚔️ · 📅 · ⚡ · 🔥 · ⏸️ · 🎖️ (🕒 і ⚔️ злито — сесія 65)",
    order.join(",") === "period,days,xpdays,streaks,gaps,ach", order.join(","));
  const cycle = await page.evaluate(() => {
    document.querySelector('.lb-tab[data-tab="period"]').click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    return lbActiveTab;
  });
  t("Tab із ⚔️ веде на 📅", cycle === "days", cycle);

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
  t("активний чипс перемалювався", st.active === "Місяць", st.active);

  const stored = await page.evaluate(() => localStorage.getItem("oxford_lb_period_v1"));
  t("гортання зберігається у localStorage", stored === "d30", String(stored));

  // коло замикається (сесія 65): d30 → cefr → quests → d7 → d30
  const seq = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Shift"); await page.waitForTimeout(120);
    seq.push(await page.evaluate(() => lbPeriod));
  }
  t("лівий Shift іде вперед і замикає коло", seq.join(",") === "cefr,quests,d7,d30", seq.join(","));

  // ⚠️ ПРАВИЙ Shift — назад (сесія 51, прямий вибір користувача). Playwright'ів
  // `press("Shift")` шле саме ShiftLeft, тож правий тиснемо явно через down/up.
  const back = [];
  for (let i = 0; i < 2; i++) {
    await page.keyboard.down("ShiftRight"); await page.keyboard.up("ShiftRight");
    await page.waitForTimeout(120);
    back.push(await page.evaluate(() => lbPeriod));
  }
  t("правий Shift гортає назад", back.join(",") === "d7,quests", back.join(","));

  // «⚙️ Режим» відкриває модалку (з сесії 64 Enter у меню = похід), Shift усередині — напрямок
  const perBeforeModal = await page.evaluate(() => lbPeriod);
  await page.click("#mode-btn"); await page.waitForTimeout(200);
  t("«Режим» відкриває вибір", await page.isVisible("#train-modal"));
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
    await page.evaluate(() => (document.querySelector("#lb-period-chips .lb-chip.active") || {}).textContent) === "Тиждень");

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
    labels.some((l) => /^🔁 ·/.test(l)) && !labels.some((l) => /^🎓 ·/.test(l)),
    labels.join(" | "));
  t("CEFR-гра підписана рівнем", labels.some((l) => /🎓 A1/.test(l)), labels.join(" | "));
  t("пул «Вивчаю» підписаний своїм значком", labels.some((l) => /↗ Вивчаю/.test(l)), labels.join(" | "));
  t("звичайна гра підписана напрямком", labels.some((l) => /US→UA|UA→US/.test(l)), labels.join(" | "));

  // 14. КАП ЖУРНАЛУ ІГОР (сесія 57): 20000 записів + запис, стійкий до квоти.
  const cap = await page.evaluate(() => {
    const now = Date.now(), log = [];
    for (let i = 0; i < GAMES_LOG_MAX; i++)
      log.push({ score: i % 30, wrong: 0, skipped: 0, mode: "en-ua", ts: now - (GAMES_LOG_MAX - i) * 1000, wordCount: 13700 });
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(log));
    const oldestBefore = log[0].ts;
    appendGamesLog({ score: 42, wrong: 0, skipped: 0, mode: "en-ua", ts: now, wordCount: 13700 });
    const after = JSON.parse(localStorage.getItem("oxford_games_log_v1"));
    return { max: GAMES_LOG_MAX, len: after.length,
             newestKept: after[after.length - 1].score === 42,
             oldestDropped: after[0].ts !== oldestBefore };
  });
  t("кап журналу = 20000", cap.max === 20000, String(cap.max));
  t("понад кап журнал не росте", cap.len === 20000, String(cap.len));
  t("свіжа гра лишається, найстаріша випадає",
    cap.newestKept && cap.oldestDropped, JSON.stringify(cap));

  // ⚠️ Квота: раніше `setItem` без try/catch кидав би виняток рівно в `endGame` і забирав
  // із собою денну статистику. Підміняємо Storage.prototype.setItem, щоб відтворити відмову.
  const quota = await page.evaluate(() => {
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(
      Array.from({ length: 400 }, (_, i) => ({ score: i % 30, wrong: 0, skipped: 0,
        mode: "en-ua", ts: Date.now() - (400 - i) * 1000, wordCount: 13700 }))));
    const orig = Storage.prototype.setItem;
    let refused = 0;
    Storage.prototype.setItem = function (k, v) {
      // відмовляємо, доки лог не схудне до чверті — імітація вичерпаної квоти
      if (k === "oxford_games_log_v1" && v.length > 12000) { refused++; throw new DOMException("full", "QuotaExceededError"); }
      return orig.call(this, k, v);
    };
    let threw = false;
    try { appendGamesLog({ score: 7, wrong: 0, skipped: 0, mode: "en-ua", ts: Date.now(), wordCount: 13700 }); }
    catch (e) { threw = true; }
    Storage.prototype.setItem = orig;
    const after = JSON.parse(localStorage.getItem("oxford_games_log_v1"));
    return { threw, refused, len: after.length, kept: after[after.length - 1].score === 7 };
  });
  t("переповнена квота не валить запис гри", quota.threw === false && quota.refused > 0, JSON.stringify(quota));
  t("при відмові квоти лог ріжеться, а гра пишеться",
    quota.len > 0 && quota.len < 401 && quota.kept, JSON.stringify(quota));

  // 🔥 серії: активності за всю серію + (хибні/усього) як у 📅 (скарга сесії 61: «там просто ігри»)
  const stk = await page.evaluate(() => {
    const days = {}, duo = {}, dk = i => { const d = new Date(); d.setDate(d.getDate() - i);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
    for (let i = 0; i < 3; i++) { days[dk(i)] = { games: 1, quests: 2, correct: 8, wrong: 1, skipped: 1 }; duo[dk(i)] = 1; }
    localStorage.setItem("oxford_days_v1", JSON.stringify(days)); localStorage.setItem("oxford_duolingo_v1", JSON.stringify(duo));
    // по 2 походи на день, кожен 3 ✓ + 1 ✗ → 24 відповіді походів, решта 6 — ігор
    const qlog = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const d = new Date(); d.setDate(d.getDate() - i); d.setHours(12, j);
      qlog.push({ ts: d.getTime(), tag: "quest", score: 3, wrong: 1, skipped: 0 }); }
    localStorage.setItem(GAMES_LOG_KEY, JSON.stringify(qlog));
    lbActiveTab = "streaks"; renderLeaderboard();
    const li = document.querySelector("#lb-list li");
    return { txt: li.textContent, over: li.scrollWidth > li.clientWidth };
  });
  t("🔥 серія: у дужках лише кількість відповідей (без неправильних)", !/\/\d/.test(stk.txt), stk.txt);
  t("🔥 серія: «🎮3 ⚔️6 (30)» — одне спільне число відповідей ігор + походів (6 + 24; 30.10.2026)", /🎮3 ⚔️6 \(30\)/.test(stk.txt) && !/ігор|ігри/.test(stk.txt), stk.txt);
  // денна сума НЕ містить походів (реальні дані сесії 63), а журнал має звичайні ігри → ігри з журналу, походи окремо
  const stk2 = await page.evaluate(() => {
    const k = todayKey(), now = Date.now();
    localStorage.setItem("oxford_days_v1", JSON.stringify({ [k]: { games: 2, quests: 1, correct: 15, wrong: 5, skipped: 0 } }));
    localStorage.setItem(GAMES_LOG_KEY, JSON.stringify([{ ts: now - 9e5, score: 9, wrong: 3, skipped: 0, mode: "ua-en" },
      { ts: now - 6e5, score: 6, wrong: 2, skipped: 0, mode: "ua-en" }, { ts: now - 3e5, tag: "quest", score: 8, wrong: 6, skipped: 0 }]));
    lbActiveTab = "streaks"; renderLeaderboard();
    return document.querySelector("#lb-list li").textContent; });
  t("🔥 серія: ігри й походи — одним числом відповідей (🎮2 ⚔️1 (34) = 20 з ігор + 14 з походів; 30.10.2026)", /🎮2 ⚔️1 \(34\)/.test(stk2), stk2);
  t("🔥 серія: лише ігри й походи (🦉 нема), ⚔️ не дублюється", !/🦉/.test(stk.txt) && (stk.txt.match(/⚔️/g) || []).length === 1, stk.txt);
  t("🔥 серія: рядок не вилазить за панель", !stk.over, stk.txt);

  // ⚔️ вкладка походів + рядки походів у «Загальній статистиці» (сесія 61)
  const qv = await page.evaluate(() => {
    const now = Date.now(), log = [
      { score: 5, wrong: 2, skipped: 0, ts: now - 9e6, tag: "quest", time: { total: 300 }, n: { arena: 2 } },
      { score: 12, wrong: 4, skipped: 0, ts: now - 5e6, tag: "quest", time: { total: 754 }, n: { arena: 4 } },
      { score: 30, wrong: 1, skipped: 0, ts: now - 4e6, mode: "ua-en" },
      { score: 3, wrong: 1, skipped: 0, ts: now - 1e3, tag: "quest", time: { total: 95 }, n: { arena: 0 } }];   // 1 с тому: о 00:10 «−1e6» був би ВЧОРА
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(log));
    (lbActiveTab = "period", lbPeriod = "quests", renderLeaderboard());
    const rows = [...document.querySelectorAll("#lb-list li")].map(l => l.textContent);
    renderLbTotals();
    const labels = [...document.querySelectorAll("#lb-totals .lb-stat-row")].map(r => r.textContent);
    return { rows, title: document.getElementById("lb-title").textContent, labels,
      reset: getComputedStyle(document.getElementById("lb-reset")).visibility };
  });
  const qcls = await page.evaluate(() => { (lbActiveTab = "period", lbPeriod = "quests", renderLeaderboard());
    return [...document.querySelectorAll("#lb-list li")].map(l => l.className); });
  t("⚔️ вкладка: останній похід сьогодні — жовта смужка (is-new), не синя; решта без", /is-new/.test(qcls[2]) && !/is-latest-game/.test(qcls.join()) && !/is-new/.test(qcls[0] + qcls[1]), JSON.stringify(qcls));
  const qcls2 = await page.evaluate(() => { const log = loadGamesLog().map(g => ({ ...g, ts: g.ts - 2 * 864e5 }));
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(log)); (lbActiveTab = "period", lbPeriod = "quests", renderLeaderboard());
    const r = [...document.querySelectorAll("#lb-list li")].map(l => l.className); localStorage.setItem("oxford_games_log_v1", JSON.stringify(log.map(g => ({ ...g, ts: g.ts + 2 * 864e5 })))); return r; });
  const kil = await page.evaluate(() => { const log = loadGamesLog(); localStorage.setItem("oxford_games_log_v1", JSON.stringify(
      [{ ts: Date.now(), tag: "quest", score: 5, wrong: 1, skipped: 0, n: { arena: 1 }, kills: { A1: 2, B1: 3, C2: 1 } }]));
    (lbActiveTab = "period", lbPeriod = "quests", renderLeaderboard()); const li = document.querySelector("#lb-list li");
    const r = { mons: li.querySelectorAll(".lb-mon svg").length, txt: li.textContent }; localStorage.setItem("oxford_games_log_v1", JSON.stringify(log)); return r; });
  t("⚔️ вкладка: убиті монстри міні-копіями за видом замість 🏟️", kil.mons === 3 && !/🏟️/.test(kil.txt) && /2.*3.*1/.test(kil.txt), JSON.stringify(kil));
  t("⚔️ вкладка: сьогодні ще не ходив — останній похід синьою смужкою (без жовтої)", /is-latest-game/.test(qcls2[2]) && !/is-new/.test(qcls2.join()), JSON.stringify(qcls2));
  t("⚔️ вкладка: лише походи, за переможеними (12, 5, 3)", qv.rows.length === 3 && /^12/.test(qv.rows[0]) && /^5/.test(qv.rows[1]) && /^3/.test(qv.rows[2]), JSON.stringify(qv.rows));
  t("⚔️ рядок: (втечі/усього), тривалість, арена", /\(4\/16\)/.test(qv.rows[0]) && /12:34/.test(qv.rows[0]) && /🏟️4/.test(qv.rows[0]), qv.rows[0]);
  t("⚔️ заголовок «Рекорди походів · 3 походи», кошика нема", /Рекорди походів/.test(qv.title) && /3 походи/.test(qv.title) && qv.reset === "hidden", qv.title);
  const iQ = qv.labels.findIndex(x => /^⚔️Походів/.test(x)), iG = qv.labels.findIndex(x => /^🎮Ігор/.test(x));
  t("статистика: «Походів» вище за «Ігор», між ними — монстри й слів на похід", iQ >= 0 && iG === iQ + 3 &&
    /20переможених7втеч27монстрів/.test(qv.labels[iQ + 1]) && /Слів на 1 похід9,0/.test(qv.labels[iQ + 2]), JSON.stringify(qv.labels.slice(iQ, iQ + 4)));

  // ⚔️ діри в журналі: день має 3 походи, журнал — 1 → міграція відновлює 2 (залишок відповідей дня)
  const gap = await page.evaluate(() => {
    const k = todayKey(), now = Date.now();
    localStorage.setItem("oxford_days_v1", JSON.stringify({ [k]: { games: 1, quests: 3, correct: 30, wrong: 12, skipped: 1 } }));
    localStorage.setItem("oxford_games_log_v1", JSON.stringify([
      { score: 10, wrong: 3, skipped: 1, ts: now - 5000, mode: "ua-en" },
      { score: 6, wrong: 2, skipped: 0, ts: now - 3000, tag: "quest", time: { total: 100 }, n: { arena: 0 } }]));
    localStorage.removeItem("oxford_fix_quest_log_gap_v1");
    return true; });
  await page.reload(); await page.waitForTimeout(1000);
  const gap2 = await page.evaluate(() => {
    const qs = loadGamesLog().filter(g => g.tag === "quest");
    (lbActiveTab = "period", lbPeriod = "quests", renderLeaderboard());
    renderLbTotals();
    const qRow = [...document.querySelectorAll("#lb-totals .lb-stat-row")].map(r => r.textContent).find(x => /^⚔️Походів/.test(x));
    return { n: qs.length, rec: qs.filter(g => g.rec).map(g => [g.score, g.wrong]), title: document.getElementById("lb-title").textContent, qRow,
      rows: [...document.querySelectorAll("#lb-list li")].map(l => l.textContent) };
  });
  t("діри журналу: відновлено 2 походи → у ⚔️ стільки ж, скільки в статистиці (3)", gap2.n === 3 && /3 походи/.test(gap2.title) && /Походів3/.test(gap2.qRow), JSON.stringify(gap2));
  t("відновлений похід = залишок дня (14 ✓ / 7 ✗), другий — порожній, з позначкою", JSON.stringify(gap2.rec) === "[[14,7],[0,0]]" && gap2.rows.some(r => /відновлено/.test(r)), JSON.stringify(gap2));

  console.log(bad.length ? "❌ ПРОВАЛЕНО:\n  " + bad.join("\n  ") : "✅ " + ok.length + " перевірок пройдено");
  console.log(errors.length ? "❌ помилки консолі:\n  " + errors.join("\n  ") : "✅ 0 помилок консолі");
  await browser.close();
  process.exit(bad.length || errors.length ? 1 : 0);
})();
