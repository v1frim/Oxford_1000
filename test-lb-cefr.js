// Браузерний тест лідерборду (сесія 43) — реальний Chromium, реальний index.html.
//
// Запуск:
//   npm i playwright-core          (драйвер; Chromium уже лежить у /opt/pw-browsers)
//   node test-lb-cefr.js
//
// Покриває:
//   • міграцію oxford_fix_lb_refill_v1 — відновлення 10-го місця з games-log
//     і викидання «порожньої» гри (0 очок, 0 відповідей) із топ-10;
//   • захист endGame: порожня гра не пише ні в scores, ні в latest, ні в лог;
//   • вкладку 🎓 «Рекорди за рівнями CEFR» — по рядку на набір рівнів,
//     рекорд пулу, лічильник ігор, «ост»-рядок, відсутність медалей/номерів.
// У verify.sh НЕ входить (потрібен зовнішній драйвер) — ганяти вручну після
// змін у лідерборді.

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

const DAY = 86400000;

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
  // ЧАСТИНА 1. Міграція: відновлення 10-го місця + чистка порожньої гри
  // ─────────────────────────────────────────────────────────────────
  await page.goto(PAGE);
  await page.evaluate((DAY) => {
    localStorage.clear();
    const now = Date.now();
    const g = (score, bad, ageDays) => ({ score, wrong: bad, skipped: 0, mode: "ua-en",
      ts: now - ageDays * DAY, wordCount: 7789 });
    // топ після міграції сесії 42: 9 «справжніх» ігор + порожня гра, що зайняла вільний слот
    const scores = [14, 14, 13, 13, 13, 12, 12, 12, 12].map((s, i) => ({ ...g(s, 2, 30 - i), id: "old" + i }));
    scores.push({ ...g(0, 0, 0), id: "empty" });
    localStorage.setItem("oxford_scores_v1", JSON.stringify(scores));
    // лог: ті самі 9 ігор + витіснена (11 очок) + порожня + CEFR-гра (не для рейтингу)
    const log = scores.map(({ id, ...rest }) => rest);
    log.push(g(11, 3, 40));                                        // ← «загублене» 10-те місце
    log.push({ ...g(17, 1, 1), tag: "cefr:A1" });                   // CEFR — у топ-10 не пускати
    log.push({ ...g(16, 1, 2), tag: "known" });                     // «Знаю» — теж ні
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(log));
    localStorage.setItem("oxford_today_best_v1", JSON.stringify({ key: new Date().toISOString().slice(0, 10),
      score: 0, wrong: 0, skipped: 0, mode: "ua-en", ts: now, wordCount: 7789 }));
  }, DAY);
  await page.reload();
  await page.waitForTimeout(1200);

  const after = await page.evaluate(() => ({
    scores: loadScores().map(s => ({ score: s.score, tag: s.tag || null, id: s.id })),
    flag: localStorage.getItem("oxford_fix_lb_refill_v1"),
    todayBest: loadTodayBest(),
  }));
  t("міграція проставила прапор", after.flag === "1", String(after.flag));
  t("у топ-10 рівно 10 ігор", after.scores.length === 10, JSON.stringify(after.scores.map(s => s.score)));
  t("порожня гра (0/0) прибрана з топу", !after.scores.some(s => s.score === 0), JSON.stringify(after.scores.map(s => s.score)));
  t("витіснене 10-те місце відновлено з логу", after.scores.some(s => s.score === 11),
    JSON.stringify(after.scores.map(s => s.score)));
  t("CEFR-гра в топ-10 НЕ потрапила", !after.scores.some(s => s.score === 17), JSON.stringify(after.scores.map(s => s.score)));
  t("гра пулом «Знаю» в топ-10 НЕ потрапила", !after.scores.some(s => s.score === 16), JSON.stringify(after.scores.map(s => s.score)));
  t("порядок топу — за очками", after.scores.every((s, i, a) => i === 0 || a[i - 1].score >= s.score),
    JSON.stringify(after.scores.map(s => s.score)));
  t("старі id збережені (не перезаписані)", after.scores.filter(s => /^old/.test(s.id)).length === 9,
    JSON.stringify(after.scores.map(s => s.id)));
  t("порожня «найкраща гра дня» прибрана", after.todayBest === null, JSON.stringify(after.todayBest));

  // повторне завантаження нічого не ламає (ідемпотентність)
  await page.reload();
  await page.waitForTimeout(900);
  const again = await page.evaluate(() => loadScores().map(s => s.score));
  t("міграція ідемпотентна", again.length === 10 && again[9] === 11, JSON.stringify(again));

  // ─────────────────────────────────────────────────────────────────
  // ЧАСТИНА 2. Порожня гра більше не потрапляє в рейтинг
  // ─────────────────────────────────────────────────────────────────
  const empty = await page.evaluate(() => {
    const before = { scores: loadScores().length, log: loadGamesLog().length, latest: loadLatest() };
    activePool = null; timedPoolTag = null; score = 0; records = [];
    endGame(true);
    return { before, after: { scores: loadScores().length, log: loadGamesLog().length, latest: loadLatest() } };
  });
  t("порожня гра не пише в топ-10", empty.after.scores === empty.before.scores,
    empty.before.scores + " → " + empty.after.scores);
  t("порожня гра не пише в games-log", empty.after.log === empty.before.log,
    empty.before.log + " → " + empty.after.log);
  t("порожня гра не стає «останньою»", JSON.stringify(empty.after.latest) === JSON.stringify(empty.before.latest));

  // а звичайна гра (є відповіді) — пише
  const real = await page.evaluate(() => {
    const before = loadGamesLog().length;
    activePool = null; timedPoolTag = null; score = 5;
    records = [{ status: "wrong" }, { status: "skipped" }];
    endGame(true);
    const last = loadLatest();
    return { grew: loadGamesLog().length === before + 1, last };
  });
  t("звичайна гра пише в лог і в «останню»", real.grew && real.last && real.last.score === 5,
    JSON.stringify(real.last));

  // ─────────────────────────────────────────────────────────────────
  // ЧАСТИНА 3. Вкладка 🎓 «Рекорди за рівнями CEFR»
  // ─────────────────────────────────────────────────────────────────
  await page.evaluate((DAY) => {
    const now = Date.now();
    const g = (score, bad, ageDays, tag) => ({ score, wrong: bad, skipped: 0, mode: "ua-en",
      ts: now - ageDays * DAY, wordCount: 1240, tag });
    const log = loadGamesLog().filter(x => !x.tag);
    log.push(g(11, 3, 5, "cefr:A1"));
    log.push(g(16, 1, 4, "cefr:A1"));      // ← рекорд A1
    log.push(g(9, 4, 3, "cefr:B1"));
    log.push(g(7, 5, 2, "cefr:A1-B2"));
    log.push(g(6, 6, 1, "cefr:—"));        // ← остання за часом
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(log));
  }, DAY);
  await page.reload();
  await page.waitForTimeout(900);
  await page.evaluate(() => { lbActiveTab = "cefr"; renderLeaderboard(); });
  await page.waitForTimeout(300);

  const tab = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("#lb-list li")].map(li => ({
      sep: li.classList.contains("lb-sep"),
      latest: li.classList.contains("lb-latest"),
      isLatest: li.classList.contains("is-latest-game"),
      score: li.querySelector(".lb-score") ? li.querySelector(".lb-score").textContent : null,
      mode: li.querySelector(".lb-mode") ? li.querySelector(".lb-mode").textContent : null,
      games: li.querySelector(".lb-games") ? li.querySelector(".lb-games").textContent : null,
      rank: li.getAttribute("data-rank"),
      badge: getComputedStyle(li, "::before").content,
      bg: getComputedStyle(li).backgroundColor,
    }));
    return { title: document.getElementById("lb-title").textContent, rows,
      resetHidden: getComputedStyle(document.getElementById("lb-reset")).visibility,
      hasClass: document.getElementById("lb-list").classList.contains("lb-cefr") };
  });
  const body = tab.rows.filter(r => !r.sep);
  t("заголовок вкладки", tab.title === "Рекорди за рівнями CEFR", tab.title);
  t("список у режимі 🎓", tab.hasClass);
  t("рядок на кожен набір рівнів", body.length === 4, JSON.stringify(body.map(r => r.mode)));
  t("рекорд A1 = найкраща гра пулу (16)", body[0] && body[0].score === "16" && /A1 ·/.test(body[0].mode),
    JSON.stringify(body[0]));
  t("лічильник ігор рівня", body[0] && /2 ігри/.test(body[0].games || ""), String(body[0] && body[0].games));
  // ⚠️ Сесія 45 змінила правило: сортуємо за СКЛАДНІСТЮ набору (найвищий рівень у
  // ньому), а не за першим рівнем мітки. Тому `A1-B2` тепер після `B1`: пул із B2-словами
  // важчий за чистий B1, хоч мітка й починається з A1. Було: A1 → A1-B2 → B1 → —.
  t("порядок рівнів: A1 → B1 → A1-B2 → — (за складністю)",
    body.slice(0, 4).every((r, i) => ["🎓 A1", "🎓 B1", "🎓 A1-B2", "🎓 —"][i] === r.mode.split(" · ")[0]),
    JSON.stringify(body.map(r => r.mode)));
  t("медалей немає (перший рядок без золотого тла)", body[0] && /rgba\(0, 0, 0, 0\)|transparent/.test(body[0].bg),
    String(body[0] && body[0].bg));
  t("зліва шапочка замість номера", body[0] && body[0].badge.includes("🎓"), String(body[0] && body[0].badge));
  t("номери місць не проставляються", body.every(r => r.rank === null), JSON.stringify(body.map(r => r.rank)));
  t("остання гра, що є рекордом, показана в списку (без «ост»-рядка)",
    !tab.rows.some(r => r.sep) && body[3] && body[3].isLatest, JSON.stringify(body[3]));

  // а якщо остання гра НЕ рекорд — вона йде окремим рядком під рискою
  const extra = await page.evaluate((DAY) => {
    const log = loadGamesLog();
    log.push({ score: 3, wrong: 8, skipped: 0, mode: "ua-en", ts: Date.now(), wordCount: 1240, tag: "cefr:A1" });
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(log));
    lbActiveTab = "cefr"; renderLeaderboard();
    const rows = [...document.querySelectorAll("#lb-list li")];
    const last = rows[rows.length - 1];
    return { sep: rows.some(li => li.classList.contains("lb-sep")),
      latest: last.classList.contains("lb-latest"),
      score: last.querySelector(".lb-score").textContent,
      mode: last.querySelector(".lb-mode").textContent,
      games: !!last.querySelector(".lb-games"),
      rows: rows.length };
  }, DAY);
  t("остання гра поза рекордами — під рискою", extra.sep && extra.latest && extra.score === "3",
    JSON.stringify(extra));
  t("«ост»-рядок без лічильника ігор", !extra.games, JSON.stringify(extra));
  t("рекорд A1 не змінився після слабкої гри",
    extra.rows === 6 && extra.mode.startsWith("🎓 A1"), JSON.stringify(extra));
  t("кнопка очищення схована на вкладці 🎓", tab.resetHidden === "hidden", tab.resetHidden);

  // перемикання назад на «Найкращі ігри» знімає режим 🎓
  const back = await page.evaluate(() => {
    const el = document.getElementById("lb-title");
    lbActiveTab = "games"; renderLeaderboard();
    const games = { title: el.textContent, sub: !!el.querySelector(".lb-title-sub"), tip: el.title };
    lbActiveTab = "days"; renderLeaderboard();
    const days = { title: el.textContent, sub: !!el.querySelector(".lb-title-sub"), tip: el.title };
    lbActiveTab = "games"; renderLeaderboard();
    return { cls: document.getElementById("lb-list").classList.contains("lb-cefr"),
      title: el.textContent, games, days,
      reset: getComputedStyle(document.getElementById("lb-reset")).visibility };
  });
  t("повернення на «Найкращі ігри» знімає .lb-cefr",
    !back.cls && back.title.startsWith("Найкращі ігри"), JSON.stringify(back.title));
  t("кнопка очищення повертається", back.reset === "visible", back.reset);
  // Уточнення «· весь словник» (сесія 45): підпис і tooltip є на вкладці ігор…
  t("заголовок ігор має підпис «весь словник»",
    back.games.sub && /весь словник/.test(back.games.title), back.games.title);
  t("заголовок ігор має tooltip з поясненням",
    /CEFR/.test(back.games.tip) && /Знаю/.test(back.games.tip), back.games.tip);
  // …і НЕ «переїжджають» на сусідню вкладку (через це й заведено setLbTitle)
  t("на сусідній вкладці підпису немає", !back.days.sub, back.days.title);
  t("на сусідній вкладці tooltip знято", back.days.tip === "", back.days.tip);

  // вкладка є в Tab-циклі і в розмітці
  const tabsOk = await page.evaluate(() => !!document.querySelector('.lb-tab[data-tab="cefr"]'));
  t("кнопка вкладки 🎓 є в розмітці", tabsOk);

  // порожній стан
  await page.evaluate(() => {
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(loadGamesLog().filter(g => !g.tag)));
    lbActiveTab = "cefr"; renderLeaderboard();
  });
  const emptyState = await page.evaluate(() => ({
    list: document.getElementById("lb-list").innerHTML,
    hint: document.getElementById("lb-empty").textContent,
    shown: !document.getElementById("lb-empty").classList.contains("hidden"),
  }));
  t("порожній стан вкладки 🎓", emptyState.shown && /Рівні CEFR/.test(emptyState.hint) && emptyState.list === "",
    JSON.stringify(emptyState.hint));

  // ── 🎓: порядок ЗА СКЛАДНІСТЮ + сума по всіх іграх набору (сесія 45) ──────────
  // Рахунки навмисно НЕ збігаються зі складністю (C2 має 9, B2+C2 — 8), тож якщо
  // сортування зіскочить назад на «за рекордом», перевірка це побачить.
  const diff = await page.evaluate(() => {
    const now = Date.now(), day = 864e5;
    const mk = (tag, score, wrong, skipped, d) => ({ score, wrong, skipped, mode: "en-ua",
      ts: now - d * day, wordCount: 8600, tag: "cefr:" + tag });
    localStorage.setItem("oxford_games_log_v1", JSON.stringify([
      mk("C2", 9, 5, 1, 3), mk("A1", 18, 1, 0, 2), mk("A1+A2", 16, 1, 0, 1),
      mk("B1-C1", 11, 4, 1, 4), mk("A2", 13, 2, 1, 5), mk("A1", 15, 2, 0, 6),
      mk("A1+A2", 12, 3, 1, 7), mk("—", 7, 6, 1, 9), mk("B2+C2", 8, 5, 2, 10),
    ]));
    lbActiveTab = "cefr"; renderLeaderboard();
    const rows = [...document.querySelectorAll("#lb-list li")].filter(li => !li.className.includes("lb-sep"));
    return {
      order: rows.map(li => li.querySelector(".lb-mode").textContent.replace(/^🎓\s*/, "").split("·")[0].trim()),
      scores: rows.map(li => +li.querySelector(".lb-score").textContent),
      a1: (() => { const li = rows.find(r => /A1 /.test(r.querySelector(".lb-mode").textContent));
        return { games: li.querySelector(".lb-games") && li.querySelector(".lb-games").textContent,
                 sum: li.querySelector(".lb-games-sum") && li.querySelector(".lb-games-sum").textContent }; })(),
      // ⚠️ мітку беремо ТОЧНО: /A2 ·/ ловило б і «A1+A2 ·», де ігор дві й сума є
      single: (() => { const li = rows.find(r =>
          r.querySelector(".lb-mode").textContent.replace(/^🎓\s*/, "").split("·")[0].trim() === "A2");
        return !!(li && li.querySelector(".lb-games-sum")); })(),
    };
  });
  t("🎓 порядок — від найлегшого набору до найважчого",
    JSON.stringify(diff.order) === JSON.stringify(["A1", "A1+A2", "A2", "B1-C1", "B2+C2", "C2", "—"]),
    JSON.stringify(diff.order));
  t("🎓 сортує складність, а не рекорд", diff.scores.join(",") !== [...diff.scores].sort((x, y) => y - x).join(","),
    JSON.stringify(diff.scores));
  t("🎓 «—» (без рівня) стоїть останнім", diff.order[diff.order.length - 1] === "—", JSON.stringify(diff.order));
  t("🎓 сума по всіх іграх набору", diff.a1.sum === "· 33 (3/36)", JSON.stringify(diff.a1));
  t("🎓 лічильник ігор лишився", /2 ігри/.test(diff.a1.games || ""), String(diff.a1.games));
  t("🎓 на одній грі суми немає (дублювала б рекорд)", diff.single === false);

  console.log("✅ " + ok.length + " перевірок пройдено");
  if (bad.length) console.log("❌ ПРОВАЛЕНО:\n - " + bad.join("\n - "));
  console.log(errors.length
    ? "❌ помилки консолі:\n - " + errors.slice(0, 5).join("\n - ")
    : "✅ 0 помилок консолі");
  await browser.close();
  process.exit(bad.length || errors.length ? 1 : 0);
})();
