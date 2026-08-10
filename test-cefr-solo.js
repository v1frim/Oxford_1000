// Браузерний тест набору «📖 Один рівень — лише невивчені» (сесія 46) —
// реальний Chromium, реальний index.html.
//
// Запуск:
//   npm i playwright-core          (драйвер; Chromium уже лежить у /opt/pw-browsers)
//   node test-cefr-solo.js
//   PW_CORE=/шлях/до/node_modules/playwright-core node test-cefr-solo.js
//
// ~20 перевірок: другий ряд чипсів (відсоток «Знаю» + скільки лишилось), одиничний
// вибір, пул тільки з Вивчаю+Нові обраного рівня, підписи, тег «cefr:A1 📖» і його
// місце у вкладці 🎓. У verify.sh НЕ входить (потрібен зовнішній драйвер).

const fs = require("fs");
const path = require("path");

const PAGE = "file://" + path.join(__dirname, "index.html");
const BROWSERS = "/opt/pw-browsers";

function loadChromium() {
  for (const t of [process.env.PW_CORE, "playwright-core"].filter(Boolean)) {
    try { return require(t).chromium; } catch (e) { /* далі */ }
  }
  console.log("⚠️  playwright-core не знайдено. Постав його:  npm i playwright-core");
  process.exit(2);
}
function chromePath() {
  const dir = fs.existsSync(BROWSERS)
    ? fs.readdirSync(BROWSERS).find(d => /^chromium-\d/.test(d)) : null;
  if (!dir) { console.log("⚠️  Chromium не знайдено в " + BROWSERS); process.exit(2); }
  return path.join(BROWSERS, dir, "chrome-linux", "chrome");
}

(async () => {
  const chromium = loadChromium();
  const browser = await chromium.launch({ executablePath: chromePath(), args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));

  const ok = [], bad = [];
  const t = (name, cond, extra = "") => (cond ? ok : bad).push(name + (extra ? " — " + extra : ""));

  await page.goto(PAGE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1200);

  // ── 1. Ряд чипсів існує і стоїть НИЖЧЕ основного набору ──────────────
  await page.click("#start-btn");
  t("модалка відкрилась", await page.isVisible("#train-modal"));
  t("ряд «один рівень» видно", await page.isVisible("#tm-solo"));
  const order = await page.evaluate(() => {
    const card = document.querySelector(".tm-card");
    const kids = [...card.children];
    return kids.indexOf(document.querySelector(".tm-sets")) < kids.indexOf(document.getElementById("tm-solo-wrap"));
  });
  t("ряд стоїть під основним набором", order);
  const solo = await page.$$eval("#tm-solo button", bs => bs.map(b => b.dataset.solo));
  t("7 чипсів (A1-C2 + без рівня)", solo.length === 7, solo.join(","));

  // ── 2. Відсоток і залишок рахуються з mastery ────────────────────────
  const fresh = await page.$$eval("#tm-solo button", bs => bs.map(b => ({
    pc: b.querySelector(".lvp").textContent, n: +b.querySelector(".lvn").textContent })));
  t("на чистому старті всюди 0%", fresh.every(x => x.pc === "0%"), JSON.stringify(fresh.map(x => x.pc)));
  const counts = await page.evaluate(() => cefrCounts());
  const soloSum = fresh.reduce((a, x) => a + x.n, 0);
  const words = await page.evaluate(() => WORDS.length);
  t("сума залишків = WORDS, поки нічого не вивчено", soloSum === words, soloSum + " vs " + words);
  t("залишок A1 = розміру рівня", fresh[0].n === counts.A1, fresh[0].n + " vs " + counts.A1);

  // позначимо частину A1 як «Знаю» і перевіримо перерахунок
  const seeded = await page.evaluate(() => {
    const m = {}, a1 = [];
    for (let i = 0; i < WORDS.length; i++) if (cefrLevelOf(WORDS[i]) === "A1") a1.push(i);
    const half = a1.slice(0, 100);
    half.forEach(i => (m[wordKey(WORDS[i])] = { s: 3, c: 3, w: 0 }));
    // одне слово з A1 у «Вивчаю» (streak 2) — воно МАЄ лишитись у пулі
    m[wordKey(WORDS[a1[100]])] = { s: 2, c: 2, w: 1 };
    localStorage.setItem("oxford_word_mastery_v1", JSON.stringify(m));
    return { total: a1.length, known: half.length };
  });
  await page.reload();
  await page.waitForTimeout(900);
  await page.click("#start-btn");
  const a1chip = await page.$eval('#tm-solo button[data-solo="A1"]', b => ({
    pc: b.querySelector(".lvp").textContent, n: +b.querySelector(".lvn").textContent, title: b.title }));
  // очікуване рахуємо НЕЗАЛЕЖНО, прямо з сирого mastery: ключ = англійське слово,
  // тож 20 пар-омонімів (run/fair/bank) ділять запис — «вивчених слів» може бути
  // трохи більше, ніж записів, які ми проставили.
  const exp = await page.evaluate(() => {
    const m = JSON.parse(localStorage.getItem("oxford_word_mastery_v1"));
    let known = 0, total = 0;
    for (let i = 0; i < WORDS.length; i++) {
      if (cefrLevelOf(WORDS[i]) !== "A1") continue;
      total++;
      const v = m[wordKey(WORDS[i])];
      if ((v && typeof v === "object" ? v.s : v) >= 3) known++;
    }
    return { known, total, pc: Math.round((known / total) * 100) + "%" };
  });
  t("відсоток «Знаю» на чипсі вірний", a1chip.pc === exp.pc, a1chip.pc + " vs " + exp.pc);
  t("залишок = рівень мінус «Знаю»", a1chip.n === exp.total - exp.known,
    a1chip.n + " vs " + (exp.total - exp.known));
  t("проставлені «Знаю» враховані", exp.known >= seeded.known, exp.known + " >= " + seeded.known);
  t("тултіп пояснює числа", /з .* у «Знаю» · грати/.test(a1chip.title), a1chip.title);

  // ── 3. Пул: тільки цей рівень і тільки поза «Знаю» ───────────────────
  const pool = await page.evaluate(() => {
    trainSet = "cefrsolo"; cefrSolo = "A1";
    const p = trainPool(), m = loadMastery();
    return {
      n: p.length,
      allA1: p.every(i => cefrLevelOf(WORDS[i]) === "A1"),
      noKnown: p.every(i => !(mStreak(m[wordKey(WORDS[i])]) >= 3)),
      hasLearning: p.some(i => mStreak(m[wordKey(WORDS[i])]) === 2),
    };
  });
  t("пул — лише слова обраного рівня", pool.allA1);
  t("у пулі немає жодного «Знаю»", pool.noKnown);
  t("слова «Вивчаю» лишаються в пулі", pool.hasLearning);
  t("розмір пулу = числу на чипсі", pool.n === a1chip.n, pool.n + " vs " + a1chip.n);

  // ── 4. Вибір рівно один, набір перемикається кліком по чипсу ─────────
  await page.click('#tm-solo button[data-solo="B2"]');
  const sel = await page.evaluate(() => ({
    set: trainSet, solo: cefrSolo,
    onSolo: [...document.querySelectorAll("#tm-solo button.on")].map(b => b.dataset.solo),
    onSets: [...document.querySelectorAll(".tm-set.on")].map(b => b.dataset.set),
    levelsHidden: document.getElementById("tm-levels").classList.contains("hidden"),
    stored: JSON.parse(localStorage.getItem("oxford_train_sel_v1") || "{}"),
  }));
  t("клік по чипсу вмикає набір «один рівень»", sel.set === "cefrsolo", sel.set);
  t("активний рівно один чипс", sel.onSolo.length === 1 && sel.onSolo[0] === "B2", sel.onSolo.join(","));
  t("картки основного набору погасли", sel.onSets.length === 0, sel.onSets.join(","));
  t("мультивибірний ряд CEFR схований", sel.levelsHidden);
  t("вибір збережено в localStorage", sel.stored.set === "cefrsolo" && sel.stored.solo === "B2",
    JSON.stringify(sel.stored));
  // повторний клік по активному не знімає вибір
  await page.click('#tm-solo button[data-solo="B2"]');
  t("повторний клік лишає рівень обраним",
    await page.evaluate(() => trainSet === "cefrsolo" && cefrSolo === "B2"));

  // ── 5. Підписи ───────────────────────────────────────────────────────
  const labels = await page.evaluate(() => ({
    go: document.getElementById("tm-go").textContent,
    sub: document.getElementById("start-sub").textContent,
    label: trainSetLabel(),
  }));
  t("на кнопці «Почати» — рівень і режим", /B2 · лише невивчені/.test(labels.go), labels.go);
  t("підпис у меню синхронний", /B2 · лише невивчені/.test(labels.sub), labels.sub);

  // ── 6. Порожній рівень: 0 слів → грати нічим ─────────────────────────
  await page.evaluate(() => {
    const m = JSON.parse(localStorage.getItem("oxford_word_mastery_v1"));
    for (let i = 0; i < WORDS.length; i++)
      if (cefrLevelOf(WORDS[i]) === "A2") m[wordKey(WORDS[i])] = { s: 3, c: 3, w: 0 };
    localStorage.setItem("oxford_word_mastery_v1", JSON.stringify(m));
  });
  await page.reload();
  await page.waitForTimeout(900);
  await page.click("#start-btn");
  await page.click('#tm-solo button[data-solo="A2"]');
  const empty = await page.$eval('#tm-solo button[data-solo="A2"]', b => ({
    pc: b.querySelector(".lvp").textContent, n: +b.querySelector(".lvn").textContent,
    full: b.classList.contains("full") }));
  t("вивчений рівень = 100%", empty.pc === "100%", empty.pc);
  t("вивчений рівень = 0 слів у пулі", empty.n === 0, String(empty.n));
  t("вивчений рівень притьмарений", empty.full);
  t("«Почати» заблоковано на порожньому пулі", await page.$eval("#tm-go", b => b.disabled));

  // ── 7. Тег гри й місце у вкладці 🎓 ──────────────────────────────────
  const tag = await page.evaluate(() => {
    trainSet = "cefrsolo"; cefrSolo = "A1"; trainDir = "ua-en";
    startTraining();
    const r = { tag: timedPoolTag, poolSize: shuffledIndices.length,
      allA1: shuffledIndices.every(i => cefrLevelOf(WORDS[i]) === "A1") };
    endGame();
    return r;
  });
  t("тег гри = «cefr:A1 📖»", tag.tag === "cefr:A1 📖", String(tag.tag));
  t("тег лишає гру поза топ-10", String(tag.tag).indexOf("cefr:") === 0);
  t("у грі тільки слова рівня", tag.allA1 && tag.poolSize > 0, JSON.stringify(tag));
  const inLog = await page.evaluate(() =>
    loadGamesLog().some(g => g.tag === "cefr:A1 📖") && !loadScores().some(g => g.tag === "cefr:A1 📖"));
  t("гра є в лозі, але не в топ-10", inLog);
  const sorted = await page.evaluate(() => {
    // «A1 📖» має стояти поруч зі своїм рівнем, але окремим рядком — одразу після «A1»
    const log = loadGamesLog();
    log.push({ score: 5, wrong: 1, skipped: 0, mode: "ua-en", ts: Date.now(), wordCount: 8650, tag: "cefr:A1" });
    log.push({ score: 4, wrong: 1, skipped: 0, mode: "ua-en", ts: Date.now(), wordCount: 8650, tag: "cefr:A2" });
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(log));
    lbTab = "cefr"; renderTabCefr();
    return [...document.querySelectorAll("#lb-list .lb-mode")].map(e => e.textContent.trim());
  });
  t("«A1 📖» іде одразу після «A1»",
    /🎓 A1 ·/.test(sorted[0] || "") && /🎓 A1 📖 ·/.test(sorted[1] || "") && /🎓 A2 ·/.test(sorted[2] || ""),
    JSON.stringify(sorted));

  console.log(bad.length ? "❌ ПОМИЛКИ:\n  " + bad.join("\n  ") : "✅ " + ok.length + " перевірок пройдено");
  if (errors.length) console.log("⚠️  консоль:\n  " + errors.slice(0, 8).join("\n  "));
  else console.log("✅ 0 помилок консолі");
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
