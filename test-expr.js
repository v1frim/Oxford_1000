// Тест розділу «Вирази і сленг» (сесія 47): XP за картки, два напрямки з окремими
// статусами, виключення «Вивчено» з колоди, вкладки статусів із лічильниками.
// Запуск: npm i playwright-core && node test-expr.js
const fs = require("fs"), path = require("path");
const PAGE = "file://" + path.join(__dirname, "index.html");
function chromium(){ for (const t of [process.env.PW_CORE,"playwright-core"].filter(Boolean)) { try { return require(t).chromium; } catch(e){} }
  console.log("⚠️  npm i playwright-core"); process.exit(2); }
function exe(){ const d=fs.readdirSync("/opt/pw-browsers").find(x=>/^chromium-\d/.test(x));
  if(!d){console.log("⚠️  немає Chromium");process.exit(2);} return "/opt/pw-browsers/"+d+"/chrome-linux/chrome"; }

(async () => {
  const b = await chromium().launch({ executablePath: exe(), args:["--no-sandbox"] });
  const p = await b.newPage({ viewport:{width:1500,height:1000} }); const errs=[];
  p.on("pageerror", e=>errs.push(e.message));
  p.on("console", m=>{ if (m.type()==="error") errs.push(m.text()); });
  await p.goto(PAGE); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  const ok=[],bad=[]; const t=(n,c,x="")=>(c?ok:bad).push(n+(x?" — "+x:""));

  // ── 1. Ставки й сховища оголошені до міграцій (TDZ-пастка проекту) ──────────
  const consts = await p.evaluate(() => ({
    card: EXPR_CARD_XP, know: EXPR_KNOW_XP, key: EXPR_XP_KEY,
    kEn: EXPR_STATUS_KEY, kUa: EXPR_STATUS_KEY_UA,
    v17: localStorage.getItem("oxford_xp_formula_v17"),
    backup: BACKUP_KEYS.includes("oxford_expr_xp_v1") && BACKUP_KEYS.includes("oxford_expr_status_ua_v1")
  }));
  t("картка = +1 XP", consts.card === 1, String(consts.card));
  t("«Знаю» = +3 XP", consts.know === 3, String(consts.know));
  t("окремі ключі статусів для двох напрямків", consts.kEn === "oxford_expr_status_v1" && consts.kUa === "oxford_expr_status_ua_v1");
  t("міграція formula_v17 відпрацювала (не впала в TDZ)", consts.v17 === "1", String(consts.v17));
  t("нові ключі в BACKUP_KEYS", consts.backup);

  // ── 2. Модалка відкривається, є обидва ряди вкладок ─────────────────────────
  await p.click("#expr-btn"); await p.waitForTimeout(250);
  t("модалка виразів відкрилась", await p.isVisible("#expr-overlay"));
  t("три вкладки категорій", (await p.$$(".expr-tab")).length === 3);
  t("два напрямки US→UA / UA→US", (await p.$$(".expr-dirbtn")).length === 2);
  t("три вкладки статусів", (await p.$$(".expr-stab")).length === 3);
  const dirLabels = await p.$$eval(".expr-dirbtn", es => es.map(e => e.textContent));
  t("підписи напрямків", dirLabels.join("|") === "US→UA|UA→US", dirLabels.join("|"));
  t("US→UA активний за замовчуванням", await p.$eval(".expr-dirbtn.active", e => e.textContent) === "US→UA");

  // ── 3. Лічильники статусів = розкладка банку по поточному напрямку ──────────
  const c0 = await p.$$eval(".expr-stab", es => es.map(e => Number((e.textContent.match(/\((\d+)\)/)||[])[1])));
  const bankSize = await p.evaluate(() => EXPR_BANK.length);
  t("сума лічильників статусів = розмір банку", c0.reduce((a,x)=>a+x,0) === bankSize, c0.join("+")+" vs "+bankSize);
  t("на старті все в «На черзі»", c0[0] === bankSize && c0[1] === 0 && c0[2] === 0, c0.join("/"));

  // ── 4. Показ картки дає +1 XP і пише подію в лог по днях ────────────────────
  const xp0 = await p.evaluate(() => loadXp());
  await p.click(".expr-practice-btn"); await p.waitForTimeout(200);
  t("тренування стартувало", await p.isVisible(".exf-card"));
  // en беремо зі стану колоди, а не з тексту: у .exf-en домішана кнопка 🔊
  const frontEn = await p.evaluate(() => exprDeck[exprPos].en);
  await p.click('[data-act="reveal"]'); await p.waitForTimeout(150);
  const afterReveal = await p.evaluate(() => ({ xp: loadXp(), log: loadExprXpLog()[gptToday()] || {} }));
  t("показ картки дав +1 XP", afterReveal.xp === xp0 + 1, xp0 + " → " + afterReveal.xp);
  t("подія показу записана в лог по днях", afterReveal.log.r === 1, JSON.stringify(afterReveal.log));
  t("переклад відкрився", await p.isVisible(".exf-ua"));

  // повторний reveal того ж стану не має нараховувати вдруге
  await p.evaluate(() => exprReveal());
  t("повторний reveal не фармить XP", (await p.evaluate(() => loadXp())) === xp0 + 1);

  // ── 5. «Знаю» дає +3 і лише за перехід ─────────────────────────────────────
  await p.click('[data-act="rate"][data-rate="learned"]'); await p.waitForTimeout(150);
  const afterKnow = await p.evaluate(() => ({ xp: loadXp(), log: loadExprXpLog()[gptToday()] || {} }));
  t("«Знаю» дало +3 XP", afterKnow.xp === xp0 + 4, String(afterKnow.xp - xp0));
  t("подія «знаю» записана окремо", afterKnow.log.k === 1, JSON.stringify(afterKnow.log));

  // ── 6. Статус ліг у сховище САМЕ того напрямку ──────────────────────────────
  const split = await p.evaluate(en => ({
    en2ua: JSON.parse(localStorage.getItem("oxford_expr_status_v1") || "{}")[en],
    ua2en: JSON.parse(localStorage.getItem("oxford_expr_status_ua_v1") || "{}")[en]
  }), frontEn);
  t("«вивчено» записалось у US→UA", split.en2ua === "learned", String(split.en2ua));
  t("UA→US лишився незайманим", split.ua2en === undefined, String(split.ua2en));

  // ── 7. Вивчена картка не потрапляє в колоду ЦЬОГО напрямку, але є в іншому ──
  const decks = await p.evaluate(en => {
    exprDir = "en2ua"; exprFilter = "all"; exprStatusFilter = "";
    const a = exprPracticeList().some(x => x.en === en);
    exprDir = "ua2en";
    const b = exprPracticeList().some(x => x.en === en);
    exprDir = "en2ua";
    return { inEn: a, inUa: b };
  }, frontEn);
  t("вивчена картка зникла з колоди US→UA", decks.inEn === false);
  t("та сама картка ще в колоді UA→US", decks.inUa === true);

  // ── 8. Список: лічильники оновились, кнопка «Тренувати» рахує без вивчених ──
  await p.click('[data-act="list"]'); await p.waitForTimeout(200);
  const c1 = await p.$$eval(".expr-stab", es => es.map(e => Number((e.textContent.match(/\((\d+)\)/)||[])[1])));
  t("лічильник «Вивчено» = 1", c1[2] === 1, c1.join("/"));
  t("лічильник «На черзі» зменшився", c1[0] === bankSize - 1, c1.join("/"));
  const practiceN = Number((await p.$eval(".expr-practice-btn", e => e.textContent)).match(/\((\d+)\)/)[1]);
  t("кнопка тренування не рахує вивчені", practiceN === bankSize - 1, String(practiceN));

  // ── 9. Перемикання напрямку показує ЙОГО статуси ────────────────────────────
  await p.click('[data-act="dir"][data-dir="ua2en"]'); await p.waitForTimeout(200);
  const c2 = await p.$$eval(".expr-stab", es => es.map(e => Number((e.textContent.match(/\((\d+)\)/)||[])[1])));
  t("у UA→US усе ще «На черзі»", c2[0] === bankSize && c2[2] === 0, c2.join("/"));

  // ── 10. UA→US: спереду український текст, 🔊 тільки після розкриття ─────────
  await p.click(".expr-practice-btn"); await p.waitForTimeout(200);
  const ua = await p.evaluate(() => ({
    front: document.querySelector(".exf-ua-front") !== null,
    speak: document.querySelector(".exf-speak") !== null,
    txt: document.querySelector(".exf-en").textContent.trim()
  }));
  t("UA→US показує український бік", ua.front, ua.txt);
  t("до розкриття немає 🔊 (не видає відповідь)", ua.speak === false);
  await p.click('[data-act="reveal"]'); await p.waitForTimeout(150);
  const ua2 = await p.evaluate(() => ({
    back: document.querySelector(".exf-en-back") !== null,
    speak: document.querySelector(".exf-speak") !== null
  }));
  t("після розкриття видно англійський бік", ua2.back);
  t("після розкриття 🔊 з'явився", ua2.speak);

  // ── 11. Фільтр статусу перемикається і скидається повторним кліком ──────────
  await p.click('[data-act="list"]'); await p.waitForTimeout(200);
  await p.click('[data-act="status"][data-status="queue"]'); await p.waitForTimeout(200);
  t("фільтр статусу увімкнувся", await p.evaluate(() => exprStatusFilter) === "queue");
  await p.click('[data-act="status"][data-status="queue"]'); await p.waitForTimeout(200);
  t("повторний клік скидає фільтр", await p.evaluate(() => exprStatusFilter) === "");

  // ── 12. Кнопка-цикл у списку статус міняє, але XP НЕ дає ────────────────────
  const beforeCycle = await p.evaluate(() => loadXp());
  const cycled = await p.evaluate(() => {
    const el = document.querySelector('[data-act="cycle"]');
    const id = el.dataset.id, was = getExprStatus(id);
    el.click();
    return { was, now: getExprStatus(id) };
  });
  await p.waitForTimeout(150);
  t("клік по статусу в списку міняє статус", cycled.now !== cycled.was, cycled.was + "→" + cycled.now);
  t("статус зі списку XP не нараховує", (await p.evaluate(() => loadXp())) === beforeCycle);

  // ── 13. Формула XP бачить нове джерело і без нього не падає ─────────────────
  const formula = await p.evaluate(() => {
    const d = "2026-01-05";
    const log = { [d]: { r: 5, k: 2 } };
    const withExpr = computeDayStatsXp(d, {}, [], {}, {}, {}, {}, {}, {}, {}, {}, null, log);
    const without  = computeDayStatsXp(d, {}, [], {}, {}, {}, {}, {}, {}, {}, {});   // старі виклики міграцій
    return { withExpr, without };
  });
  t("computeDayStatsXp рахує 5×1 + 2×3 = 11", formula.withExpr === 11, String(formula.withExpr));
  t("без параметра — стара поведінка (0)", formula.without === 0, String(formula.without));

  // ── 14. У банку більше немає простих слів, прибраних із пісенного сленгу ────
  const plain = await p.evaluate(() => {
    const gone = ["careless","reckless","complacent","genuine","commit","stall","handout",
                  "wristband","intoxicated","defenseless","standout","beginner","outwork"];
    return gone.filter(w => EXPR_BANK.some(x => x.en.toLowerCase() === w));
  });
  t("прості слова прибрані з «Виразів»", plain.length === 0, plain.join(", "));

  console.log((bad.length ? "❌ " + bad.length + " помилок:\n" + bad.map(x=>"   • "+x).join("\n") + "\n" : "") +
              "✅ " + ok.length + " перевірок пройдено");
  console.log(errs.length ? "❌ помилки консолі:\n" + errs.map(x=>"   • "+x).join("\n") : "✅ 0 помилок консолі");
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
