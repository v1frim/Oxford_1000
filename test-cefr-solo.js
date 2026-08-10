// Браузерний тест другого ряду чипсів «📖 лише невивчені» (сесія 46) —
// реальний Chromium, реальний index.html.
//
// Запуск:
//   npm i playwright-core          (драйвер; Chromium уже лежить у /opt/pw-browsers)
//   node test-cefr-solo.js
//   PW_CORE=/шлях/до/node_modules/playwright-core node test-cefr-solo.js
//
// Перевіряє: два ряди = ОДИН спільний вибір, взаємне блокування однакових рівнів
// (`.taken`), змішаний пул (повні рівні + невивчені слова 📖-рівнів), відсотки
// «Знаю» на чипсах, мітки «A1 📖+B1» і їх місце у вкладці 🎓.
// У verify.sh НЕ входить (потрібен зовнішній драйвер).

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
  const chips = () => page.$$eval("#tm-levels button, #tm-solo button", bs => bs.map(b => ({
    lv: b.dataset.lv || b.dataset.solo, row: b.dataset.lv ? "full" : "solo",
    on: b.classList.contains("on"), taken: b.classList.contains("taken"),
  })));
  const at = (list, lv, row) => list.find(x => x.lv === lv && x.row === row);
  const state = () => page.evaluate(() => ({
    set: trainSet, full: [...cefrSel], solo: [...cefrSoloSel],
    label: cefrMixLabel(), pool: trainPool().length,
  }));

  await page.goto(PAGE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1200);

  // ── 1. Обидва ряди на місці, під картками наборів ────────────────────
  await page.click("#start-btn");
  t("модалка відкрилась", await page.isVisible("#train-modal"));
  t("ряд «повні рівні» видно", await page.isVisible("#tm-levels"));
  t("ряд «лише невивчені» видно", await page.isVisible("#tm-solo"));
  t("другий ряд стоїть під першим", await page.evaluate(() => {
    const kids = [...document.querySelector(".tm-card").children];
    return kids.indexOf(document.getElementById("tm-levels"))
         < kids.indexOf(document.getElementById("tm-solo-wrap"));
  }));
  t("7 + 7 чипсів", (await chips()).length === 14, String((await chips()).length));

  // ── 2. Відсоток «Знаю» і залишок на 📖-чипсах ────────────────────────
  const fresh = await page.$$eval("#tm-solo button", bs => bs.map(b => ({
    pc: b.querySelector(".lvp").textContent, n: +b.querySelector(".lvn").textContent })));
  t("на чистому старті всюди 0%", fresh.every(x => x.pc === "0%"), JSON.stringify(fresh.map(x => x.pc)));
  const words = await page.evaluate(() => WORDS.length);
  const soloSum = fresh.reduce((a, x) => a + x.n, 0);
  t("сума залишків = WORDS, поки нічого не вивчено", soloSum === words, soloSum + " vs " + words);

  await page.evaluate(() => {
    const m = {}, a1 = [];
    for (let i = 0; i < WORDS.length; i++) if (cefrLevelOf(WORDS[i]) === "A1") a1.push(i);
    a1.slice(0, 100).forEach(i => (m[wordKey(WORDS[i])] = { s: 3, c: 3, w: 0 }));
    m[wordKey(WORDS[a1[100]])] = { s: 2, c: 2, w: 1 };   // «Вивчаю» — має лишитись у пулі
    localStorage.setItem("oxford_word_mastery_v1", JSON.stringify(m));
  });
  await page.reload(); await page.waitForTimeout(900);
  await page.click("#start-btn");
  const a1chip = await page.$eval('#tm-solo button[data-solo="A1"]', b => ({
    pc: b.querySelector(".lvp").textContent, n: +b.querySelector(".lvn").textContent, title: b.title }));
  // очікуване рахуємо незалежно, з сирого mastery: ключ = англійське слово, тож
  // 20 пар-омонімів (run/fair/bank) ділять запис — слів виходить трохи більше.
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
  t("відсоток «Знаю» вірний", a1chip.pc === exp.pc, a1chip.pc + " vs " + exp.pc);
  t("залишок = рівень мінус «Знаю»", a1chip.n === exp.total - exp.known,
    a1chip.n + " vs " + (exp.total - exp.known));
  t("тултіп пояснює числа", /з .* у «Знаю» · грати/.test(a1chip.title), a1chip.title);

  // ── 3. Взаємне блокування однакових рівнів ───────────────────────────
  await page.evaluate(() => { cefrSel = new Set(); cefrSoloSel = new Set(["A1"]); renderTrainModal(); });
  let c = await chips();
  t("обрано A1 у 📖-ряді", at(c, "A1", "solo").on);
  t("A1 у повному ряді погашено", at(c, "A1", "full").taken);
  t("інші рівні не погашено", !at(c, "A2", "full").taken && !at(c, "B1", "solo").taken);
  await page.click('#tm-levels button[data-lv="A1"]');           // клік по погашеному
  let s = await state();
  t("клік по погашеному нічого не робить", s.solo.join() === "A1" && !s.full.length, JSON.stringify(s));

  // ── 4. Змішаний вибір: A1 📖 + A2 + B1 ───────────────────────────────
  await page.click('#tm-levels button[data-lv="A2"]');
  await page.click('#tm-levels button[data-lv="B1"]');
  s = await state();
  t("рівнів можна набрати скільки завгодно", s.full.length === 2 && s.solo.length === 1, JSON.stringify(s));
  t("мітка змішаного вибору", s.label === "A1 📖+A2+B1", s.label);
  const mix = await page.evaluate(() => {
    const p = trainPool(), m = loadMastery(), byLv = {};
    p.forEach(i => { const L = cefrLevelOf(WORDS[i]); byLv[L] = (byLv[L] || 0) + 1; });
    return {
      lvls: Object.keys(byLv).sort().join(","),
      a1known: p.filter(i => cefrLevelOf(WORDS[i]) === "A1" && mStreak(m[wordKey(WORDS[i])]) >= 3).length,
      a1learning: p.filter(i => cefrLevelOf(WORDS[i]) === "A1" && mStreak(m[wordKey(WORDS[i])]) === 2).length,
      a2in: byLv.A2, a2all: cefrIndices(["A2"]).length,
    };
  });
  t("у пулі рівно обрані рівні", mix.lvls === "A1,A2,B1", mix.lvls);
  t("з 📖-рівня жодного «Знаю»", mix.a1known === 0, String(mix.a1known));
  t("слова «Вивчаю» з 📖-рівня лишились", mix.a1learning === 1, String(mix.a1learning));
  t("повний рівень іде цілком", mix.a2in === mix.a2all, mix.a2in + " vs " + mix.a2all);

  // перенесення рівня між рядами: спершу зняти, потім обрати в іншому ряді
  await page.click('#tm-solo button[data-solo="A1"]');           // зняли A1 📖
  await page.click('#tm-levels button[data-lv="A1"]');           // взяли A1 цілком
  s = await state();
  t("рівень переноситься між рядами", s.full.includes("A1") && !s.solo.includes("A1"), JSON.stringify(s));
  c = await chips();
  t("тепер погашено A1 у 📖-ряді", at(c, "A1", "solo").taken && !at(c, "A1", "full").taken);
  t("мітка без 📖 = стара стисла форма", s.label === "A1-B1", s.label);

  // ── 5. Хоча б один рівень лишається обраним ──────────────────────────
  await page.evaluate(() => { cefrSel = new Set(["A1"]); cefrSoloSel = new Set(); renderTrainModal(); });
  await page.click('#tm-levels button[data-lv="A1"]');
  s = await state();
  t("останній рівень не знімається", s.full.join() === "A1", JSON.stringify(s));

  // ── 6. Стан переживає перезавантаження ───────────────────────────────
  await page.evaluate(() => { cefrSel = new Set(["B1"]); cefrSoloSel = new Set(["A1"]);
    saveCefrSel(); saveCefrSoloSel(); });
  await page.reload(); await page.waitForTimeout(900);
  await page.click("#start-btn");
  s = await state();
  t("вибір обох рядів збережено", s.full.join() === "B1" && s.solo.join() === "A1", JSON.stringify(s));
  const goTxt = await page.$eval("#tm-go", b => b.textContent);
  t("підпис на «Почати» = мітці", /A1 📖\+B1/.test(goTxt), goTxt);

  // ── 7. Перетин рядів у сховищі лікується на завантаженні ─────────────
  await page.evaluate(() => {
    localStorage.setItem("oxford_cefr_sel_v1", JSON.stringify(["A1", "B2"]));
    localStorage.setItem("oxford_cefr_solo_v1", JSON.stringify(["A1", "C1"]));
  });
  await page.reload(); await page.waitForTimeout(900);
  s = await state();
  t("дубль між рядами прибрано на старті",
    s.full.sort().join() === "A1,B2" && s.solo.join() === "C1", JSON.stringify(s));

  // ── 8. Тег гри й місце у вкладці 🎓 ──────────────────────────────────
  const tag = await page.evaluate(() => {
    cefrSel = new Set(); cefrSoloSel = new Set(["A1"]); trainSet = "cefr"; trainDir = "ua-en";
    startTraining();
    const m = loadMastery();
    const r = { tag: timedPoolTag, n: shuffledIndices.length,
      allA1: shuffledIndices.every(i => cefrLevelOf(WORDS[i]) === "A1"),
      noKnown: shuffledIndices.every(i => !(mStreak(m[wordKey(WORDS[i])]) >= 3)) };
    endGame();
    return r;
  });
  t("тег гри = «cefr:A1 📖»", tag.tag === "cefr:A1 📖", String(tag.tag));
  t("тег лишає гру поза топ-10", String(tag.tag).indexOf("cefr:") === 0);
  t("у грі лише невивчені слова рівня", tag.allA1 && tag.noKnown && tag.n > 0, JSON.stringify(tag));
  t("гра є в лозі, але не в топ-10", await page.evaluate(() =>
    loadGamesLog().some(g => g.tag === "cefr:A1 📖") && !loadScores().some(g => g.tag === "cefr:A1 📖")));

  const sorted = await page.evaluate(() => {
    const log = loadGamesLog(), ts = Date.now();
    log.push({ score: 5, wrong: 1, skipped: 0, mode: "ua-en", ts, wordCount: 8650, tag: "cefr:A1" });
    log.push({ score: 4, wrong: 1, skipped: 0, mode: "ua-en", ts, wordCount: 8650, tag: "cefr:A1 📖+B1" });
    log.push({ score: 3, wrong: 1, skipped: 0, mode: "ua-en", ts, wordCount: 8650, tag: "cefr:A2" });
    localStorage.setItem("oxford_games_log_v1", JSON.stringify(log));
    lbTab = "cefr"; renderTabCefr();
    return [...document.querySelectorAll("#lb-list .lb-mode")].map(e => e.textContent.trim());
  });
  t("«A1 📖» окремим рядком одразу після «A1»",
    /🎓 A1 ·/.test(sorted[0] || "") && /🎓 A1 📖 ·/.test(sorted[1] || ""), JSON.stringify(sorted));
  t("змішана мітка сортується за найвищим рівнем у наборі",
    sorted.findIndex(x => /A1 📖\+B1/.test(x)) > sorted.findIndex(x => /🎓 A2 ·/.test(x)),
    JSON.stringify(sorted));

  console.log(bad.length ? "❌ ПОМИЛКИ:\n  " + bad.join("\n  ") : "✅ " + ok.length + " перевірок пройдено");
  if (errors.length) console.log("⚠️  консоль:\n  " + errors.slice(0, 8).join("\n  "));
  else console.log("✅ 0 помилок консолі");
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
