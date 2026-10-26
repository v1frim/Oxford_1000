// Тест «⚔️ Похід героя» (сесія 61): бій → перемога / втеча з вивченням → стоп → арена → фінал.
// Запуск: npm i playwright-core && node test-quest.js
const fs = require("fs"), path = require("path");
const PAGE = "file://" + path.join(__dirname, "index.html");
function chromium(){ for (const t of [process.env.PW_CORE,"playwright-core"].filter(Boolean)) { try { return require(t).chromium; } catch(e){} }
  console.log("⚠️  npm i playwright-core"); process.exit(2); }
function exe(){ const d=fs.readdirSync("/opt/pw-browsers").find(x=>/^chromium-\d/.test(x));
  if(!d){console.log("⚠️  немає Chromium");process.exit(2);} return "/opt/pw-browsers/"+d+"/chrome-linux/chrome"; }

(async () => {
  const b = await chromium().launch({ executablePath: exe(), args:["--no-sandbox"] });
  const p = await b.newPage({ viewport:{width:1500,height:900} }); const errs=[];
  p.on("pageerror", e=>errs.push(e.message));
  p.on("console", m=>{ if (m.type()==="error") errs.push(m.text()); });
  await p.goto(PAGE); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  const ok=[],bad=[]; const t=(n,c,x="")=>(c?ok:bad).push(n+(x?" — "+x:""));
  const right = () => p.evaluate(() => mode === "ua-en" ? getEn(currentWord)[0] : getUa(currentWord)[0]);
  const fight = () => p.waitForFunction(() => Q && Q.phase === "fight", null, { timeout: 9000 });
  const day = () => p.evaluate(() => loadDays()[todayKey()] || {});

  t("кнопка «⚔️ Похід героя» у меню", await p.isVisible("#quest-btn"));
  const xp0 = await p.evaluate(() => loadXp());
  await p.click("#quest-btn"); await p.waitForTimeout(300);
  t("похід відкривається на весь екран", await p.isVisible("#quest-overlay"));
  t("герой на сцені (SVG)", await p.evaluate(() => !!document.querySelector("#q-hero svg.hero-svg")));
  await p.keyboard.press("Enter"); await p.waitForTimeout(200);
  t("Enter у поході НЕ відкриває «Тренування»", !(await p.isVisible("#train-modal")));

  // 1. перемога
  await fight(); await p.waitForTimeout(200);
  const m1 = await p.evaluate(() => ({ idx: Q.cur.idx, word: document.querySelector(".q-mon .qm-word").textContent, shown: Q.cur.shown,
    svg: !!document.querySelector(".q-mon svg.qm-svg"), lv: cefrLevelOf(WORDS[Q.cur.idx]),
    cls: document.querySelector(".q-mon").className }));
  t("з'явився монстр зі словом над головою", m1.svg && m1.word === m1.shown, m1.word);
  t("вид монстра — за рівнем CEFR слова", m1.cls.includes("lv-" + m1.lv), m1.cls);
  await p.fill("#q-answer", await right()); await p.waitForTimeout(400);
  const a1 = await p.evaluate(i => ({ won: Q.won, s: mStreak(loadMastery()[wordKey(WORDS[i])]), dead: !!document.querySelector(".q-mon.dead") }), m1.idx);
  t("правильна відповідь — монстр повалений", a1.won === 1 && a1.dead);
  t("перемога йде в mastery (streak 1)", a1.s === 1, String(a1.s));
  let d = await day();
  t("день: +1 правильна, похід = 1 «похід» (не гра)", d.correct === 1 && d.quests === 1 && !d.games, JSON.stringify(d));

  // 2. втеча: помилка → картка вивчення → Готово → 3 правильні → втеча
  await fight(); await p.waitForTimeout(200);
  const idx2 = await p.evaluate(() => Q.cur.idx);
  await p.fill("#q-answer", "абракадабра"); await p.keyboard.press("Enter"); await p.waitForTimeout(700);
  const st = await p.evaluate(() => ({ phase: Q.phase, card: document.getElementById("q-card").textContent }));
  t("помилка — одразу картка зі словом і прикладом", st.phase === "study" && /Готово/.test(st.card), st.phase);
  t("помилка йде в mastery (streak 0)", await p.evaluate(i => mStreak(loadMastery()[wordKey(WORDS[i])]) === 0, idx2));
  d = await day();
  t("день: +1 неправильна", d.wrong === 1 && d.quests === 1 && !d.games, JSON.stringify(d));
  t("утечений монстр одразу збережений для арени (переживе обрив походу)", await p.evaluate(i => loadQArena().includes(wordKey(WORDS[i])), idx2));
  const said = await p.evaluate(() => { window.__said = []; const o = speak; window.speak = speak = w => window.__said.push(w);
    const hw = document.querySelector("#q-card .qc-word .hw, #q-card .qc-ex .hw"); if (hw) hw.click();
    const n = window.__said.length; speak = o; return { n, hw: !!hw }; });
  t("клік по слову на картці озвучує його", said.hw && said.n === 1, JSON.stringify(said));
  const enHw = await p.evaluate(() => { const el = document.querySelector("#q-card .qc-word .hw"); return el ? { t: el.textContent, tr: !!el.dataset.trans, ipa: !!el.dataset.ipa } : null; });
  t("на картці англійське слово — з ховером перекладу й транскрипції", enHw && enHw.tr && enHw.ipa, JSON.stringify(enHw));
  // ± запит GPT біля значка 🤖 GPT (сесія 63): + рахує, показує число, − віднімає; картка й фаза не міняються
  const g0 = await p.evaluate(() => ({ n: loadGptRequests()[gptToday()] || 0, xp: loadXp(), plus: !!document.querySelector("#q-card .gpt-ctl [data-gpt='+']"), minus: !!document.querySelector("#q-card .gpt-ctl [data-gpt='-']") }));
  t("картка: «+» біля GPT, «−» прихований при 0", g0.plus && !g0.minus, JSON.stringify(g0));
  await p.click("#q-card .gpt-ctl [data-gpt='+']"); await p.click("#q-card .gpt-ctl [data-gpt='+']"); await p.waitForTimeout(100);
  const g1 = await p.evaluate(() => ({ n: loadGptRequests()[gptToday()] || 0, xp: loadXp(), shown: (document.querySelector("#q-card .gpt-n") || {}).textContent, phase: Q.phase, end: (document.querySelector("#end-screen .gpt-n") || {}).textContent }));
  t("«+» двічі → 2 запити, +2×GPT_XP, число на картці й на фінал-екрані, похід далі на картці", g1.n === g0.n + 2 && g1.xp === g0.xp + 30 && g1.shown === "2" && g1.end === "2" && g1.phase === "study", JSON.stringify(g1));
  await p.click("#q-card .gpt-ctl [data-gpt='-']"); await p.waitForTimeout(100);
  const g2 = await p.evaluate(() => ({ n: loadGptRequests()[gptToday()] || 0, xp: loadXp(), shown: (document.querySelector("#q-card .gpt-n") || {}).textContent, foc: document.activeElement && document.activeElement.dataset.gpt }));
  t("«−» → 1 запит, XP назад, фокус знято з кнопки", g2.n === g0.n + 1 && g2.xp === g0.xp + 15 && g2.shown === "1" && !g2.foc, JSON.stringify(g2));
  await p.click("#q-card .gpt-ctl [data-gpt='-']"); await p.waitForTimeout(100);
  const card2 = await p.evaluate(() => {
    const ua = document.querySelector("#q-card .qc-exua"), gt = document.querySelector("#q-card .qc-links .gt-link:not(.gpt)"), gpt = document.querySelector("#q-card .qc-links .gpt");
    const blur0 = ua ? getComputedStyle(ua).filter : "";
    if (ua) ua.click();
    const g0 = loadGptRequests()[gptToday()] || 0;
    document.addEventListener("click", e => e.preventDefault(), { capture: true, once: true });
    if (gpt) gpt.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));   // preventDefault вище — без нової вкладки
    return { ua: !!ua, blur0, open: ua ? getComputedStyle(ua).filter : "", gt: gt ? gt.href : "", en: Q.say, gpt: !!gpt, gptN: (loadGptRequests()[gptToday()] || 0) - g0 };
  });
  await p.waitForTimeout(300);   // transition .2s
  card2.open = await p.evaluate(() => { const ua = document.querySelector("#q-card .qc-exua"); return ua ? getComputedStyle(ua).filter : ""; });
  await p.hover("#q-card .qc-exua"); await p.waitForTimeout(300);
  card2.enBlur = await p.evaluate(() => getComputedStyle(document.querySelector("#q-card .qc-ex")).filter);
  await p.mouse.move(5, 5); await p.waitForTimeout(300);
  card2.enBack = await p.evaluate(() => getComputedStyle(document.querySelector("#q-card .qc-ex")).filter);
  t("наводиш на переклад — англійське речення розмивається, прибрав — знову видно", !card2.ua || (/blur/.test(card2.enBlur) && card2.enBack === "none"), JSON.stringify(card2));
  t("переклад речення заблюрено, клік — показує", !card2.ua || (/blur/.test(card2.blur0) && card2.open === "none"), JSON.stringify(card2));
  t("на картці — Перекладач із цим словом і GPT (клік = запит)", card2.gt.includes("translate.google.com") && card2.gt.includes(encodeURIComponent(card2.en)) && card2.gpt && card2.gptN === 1, JSON.stringify(card2));
  const keys = await p.evaluate(() => { const o = speak, out = []; speak = w => out.push(w);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    speak = o; return { out, ex: Q.sayEx, say: Q.say }; });
  t("на картці: Пробіл — речення, Tab — слово", keys.out[0] === keys.ex && keys.out[1] === keys.say, JSON.stringify(keys));
  await p.keyboard.press("Enter"); await p.waitForTimeout(200);
  t("Enter — «Готово», почалось повторення", await p.evaluate(() => Q.phase === "drill"));
  const dirs = [];
  await p.fill("#q-answer", await right()); await p.waitForTimeout(250);
  t("правильна в повторенні — лічильник 1", await p.evaluate(() => Q.drill.n === 1));
  const bub = await p.evaluate(() => { const o = speak, out = []; speak = w => out.push(w);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })); speak = o;
    return { bubble: Q.mon.querySelector(".qm-word").textContent, shown: currentShown, mode, out }; });
  t("у повторенні бульбашка монстра = промпт картки (не підказує відповідь)", bub.bubble === bub.shown, JSON.stringify(bub));
  t("Tab у повторенні озвучує англійське лише в US→UA", bub.mode === "en-ua" ? bub.out[0] === bub.shown : bub.out.length === 0, JSON.stringify(bub));
  t("правильна в повторенні — герой б'є монстра", await p.evaluate(() => document.getElementById("q-hero").classList.contains("strike") && Q.mon.classList.contains("hit")));
  const modeBeforeWrong = await p.evaluate(() => mode);
  await p.fill("#q-answer", "ні"); await p.keyboard.press("Enter"); await p.waitForTimeout(120);
  t("помилка в повторенні — монстр б'є героя", await p.evaluate(() => document.getElementById("q-hero").classList.contains("hurt") && Q.mon.classList.contains("strike-back")));
  await p.waitForTimeout(1800);
  t("помилка в повторенні НЕ обнуляє лічильник (3 правильні не обов'язково поспіль)", await p.evaluate(() => Q.drill.n === 1 && Q.phase === "drill"));
  const modeAfterWrong = await p.evaluate(() => mode);
  t("після помилки в повторенні — зворотний напрямок (бачиш те слово, якого не знав)", modeAfterWrong !== modeBeforeWrong, modeBeforeWrong + " → " + modeAfterWrong);
  const xpBeforeDrill = await p.evaluate(() => loadXp());
  for (let i = 0; i < 2; i++) { dirs.push(await p.evaluate(() => mode)); await p.fill("#q-answer", await right()); await p.waitForTimeout(250); }
  t("повторення — в обидва боки", new Set(dirs).size === 2, dirs.join(","));
  t("після 3 правильних — втеча", await p.evaluate(() => Q.phase === "flee" || Q.phase === "walk"));
  t("вивчене посеред походу слово = +2 XP", (await p.evaluate(() => loadXp())) - xpBeforeDrill === 2);
  t("журнал для перерахунку XP: день.questDrill2 = 1 (по 2 XP), старе questDrill не росте", (await day()).questDrill2 === 1 && !(await day()).questDrill);
  t("повторення посеред походу mastery НЕ чіпає", await p.evaluate(i => mStreak(loadMastery()[wordKey(WORDS[i])]) === 0, idx2));

  // 3. стоп → арена
  await fight(); await p.waitForTimeout(200);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const pause = await p.evaluate(() => document.getElementById("q-card").textContent);
  const feed = await p.evaluate(() => [...document.querySelectorAll("#q-feed .qf-row")].map(r => r.textContent));
  t("стрічка XP: монстри з розкладом «за що» (перемога, нове слово, вивчив)",
    feed.length === 2 && /перемога/.test(feed[1]) && /нове слово/.test(feed[1]) && /вивчив/.test(feed[0]), JSON.stringify(feed));
  t("стрічка XP: «втік» видно навіть поруч із бонусом слова", /втік/.test(feed[0]) && /вивчив/.test(feed[0]), feed[0]);
  t("Esc — привал із правильними / неправильними", /1\s*правильних/.test(pause) && /1\s*неправильних/.test(pause), pause.slice(0, 80));
  t("на привалі кличе на арену", /На арену/.test(pause));
  await p.keyboard.press("Enter"); await p.waitForTimeout(900);
  const ar = await p.evaluate(() => ({ stage: Q.stage, n: document.querySelectorAll(".q-mon.lined").length, target: Q.cur.idx }));
  t("арена: у ряд стоять ті, від кого втік", ar.stage === "arena" && ar.n === 1, JSON.stringify(ar));
  t("на арені — саме втечене слово", ar.target === idx2);
  const aMode0 = await p.evaluate(() => mode);
  await p.fill("#q-answer", "абракадабра"); await p.keyboard.press("Enter"); await p.waitForTimeout(2100);
  const aMode1 = await p.evaluate(() => ({ mode, cnt: Q.arena.cnt[Q.cur.idx] || 0, idx: Q.cur.idx }));
  t("арена: після помилки той самий монстр питає у зворотному напрямку", aMode1.mode !== aMode0 && aMode1.cnt === 0 && aMode1.idx === idx2, aMode0 + " → " + JSON.stringify(aMode1));
  for (let i = 0; i < 3; i++) { await p.fill("#q-answer", await right()); await p.waitForTimeout(1100); }
  await p.waitForTimeout(1200);
  const fin = await p.evaluate(() => ({ stage: Q && Q.stage, card: document.getElementById("q-card").textContent, xp: qXp(), real: loadXp() - Q.xp0,
    words: [...document.querySelectorAll("#q-card .qw-row")].map(r => ({ t: r.textContent, hw: !!r.querySelector(".hw"), miss: r.classList.contains("miss") })) }));
  t("фінал: «Слова походу» — кожне слово раз, ✓ / ✗+🏟️, англійське з ховером", fin.words.length === 2 && fin.words.every(w => w.hw) &&
    fin.words.filter(w => w.miss).length === 1 && fin.words.some(w => /✓/.test(w.t)) && fin.words.some(w => /✗/.test(w.t) && /🏟️1/.test(w.t)), JSON.stringify(fin.words));
  t("фінал: «монстрів» = правильні + неправильні (замість «добито на арені»), XP золотистим", /2монстрів/.test(fin.card) && !/добито на арені/.test(fin.card) &&
    await p.evaluate(() => getComputedStyle(document.querySelector("#q-card .qc-stats .xp")).color === "rgb(255, 209, 102)"), fin.card.slice(0, 200));
  t("фінал: 🌡️ показує очки походу", /🌡️ \+\d+ очок · ще \d+ до пункту/.test(fin.card), fin.card.slice(0, 300));
  t("3 правильні на арені — монстр добитий, фінал", fin.stage === "final" && /Похід завершено/.test(fin.card), fin.stage);
  t("XP походу = реальний приріст (1 перемога + 1 вивчення + 2 арена + бонуси mastery)", fin.xp === fin.real && fin.real >= 3 && fin.real - xp0 * 0 === (await p.evaluate(() => loadXp())) - xp0, fin.xp + " / " + fin.real);
  d = await day();
  t("арена = +1 «Повторень» дня", d.reviewCorrect === 1, JSON.stringify(d));
  t("добитий на арені монстр зник зі збереженої арени", await p.evaluate(() => loadQArena().length === 0));
  const pts = await p.evaluate(() => ({ need: [1,2,3,4,5,6,7].map(questPointNeed).join(","), d: loadDays()[todayKey()].questPts || 0,
    ans: Q.answers, q: Q.pts, exp: questPointsFor(Q.answers), at10: questPointsFor(10), at45: questPointsFor(45), at62: questPointsFor(62) }));
  t("пункти «Плани»: кожні 14 очок", pts.need === "14,28,42,56,70,84,98" && pts.at10 === 0 && pts.at45 === 3 && pts.at62 === 4, JSON.stringify(pts));
  // очки: монстр ✓ (1) + монстр ✗ (1) + завершене повторення (1) + добитий на арені (1) = 4;
  // помилки в повторенні й на арені очок НЕ дають
  t("очки походу: відповідь монстру + завершене повторення + добитий на арені = 4", pts.ans === 4, JSON.stringify(pts));
  t("пункти = очки / сходинки (і записані в день)", pts.q === pts.exp && pts.d === pts.q, JSON.stringify(pts));
  await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  const tim = await p.evaluate(() => {
    const g = loadGamesLog().find(x => x.tag === "quest"), ql = JSON.parse(localStorage.getItem("oxford_quest_log_v1") || "[]");
    const q = ql[ql.length - 1] || {};
    return { card: document.getElementById("q-card").textContent, gTime: g && g.time, gN: g && g.n,
      mons: (q.monsters || []).length, wrongRec: (q.monsters || []).find(r => !r.ok) || null, arena: (q.arena || []).length,
      arenaRec: (q.arena || [])[0] || null };
  });
  t("фінал: таблиця часу — бої з кількістю, картка, 3 правильні, арена", /Бої · 2/.test(tim.card) && /Картка зі словом/.test(tim.card) && /3 правильні після картки · 1/.test(tim.card) && /Арена · 1/.test(tim.card), tim.card.slice(0, 200));
  t("фінал: замість «Втік від» — слова, що перейшли у «Знаю»", !/Втік від/.test(tim.card), tim.card.slice(-160));
  t("недобрані очки збережено для наступного походу", await p.evaluate(() => localStorage.getItem("oxford_quest_carry_v1")) === "4");   // 4 очки, пункт — за 14
  t("журнал ігор: секунди по етапах і лічильники", tim.gTime && "fight" in tim.gTime && "arena" in tim.gTime && tim.gTime.total >= 0 && tim.gN && tim.gN.fights === 2 && tim.gN.drills === 1 && tim.gN.arena === 1, JSON.stringify([tim.gTime, tim.gN]));
  t("журнал походів: кожен монстр із часом відповіді", tim.mons === 2 && tim.wrongRec && tim.wrongRec.t >= 0 && tim.wrongRec.st >= 0 && tim.wrongRec.dr >= 0 && tim.wrongRec.da >= 3, JSON.stringify(tim.wrongRec));
  t("журнал походів: монстр арени — час і спроби (1 помилка + 3 правильні = 4)", tim.arena === 1 && tim.arenaRec.tries === 4 && tim.arenaRec.t > 0, JSON.stringify(tim.arenaRec));
  const feedA = await p.evaluate(() => [...document.querySelectorAll("#q-feed .qf-row")].map(r => r.textContent));
  t("стрічка XP: уся арена — одним рядком (+2 за добитого)", /Арена/.test(feedA[0]) && /\+2 добито 1/.test(feedA[0]) && feedA.filter(x => /Арена/.test(x)).length === 1, JSON.stringify(feedA));
  t("Enter на фіналі — назад у меню", !(await p.isVisible("#quest-overlay")) && await p.isVisible("#start-screen"));
  const inv = await p.evaluate(() => {
    const days = loadDays(), h = loadMasteryHistory(), hd = Object.keys(h).sort();
    return { live: getTodayXpGain(), rec: computeDayStatsXp(todayKey(), h, hd, days, loadDuoSessions(), loadLhDone(),
      loadGptRequests(), loadSongSessions(), loadMovieSessions(), {}, {}, {}, loadExprXpLog()) };
  });
  t("інваріант: живий XP дня == перерахунок із журналів (міграції його не з'їдять)", inv.live === inv.rec, inv.live + " / " + inv.rec);
  const lb = await p.evaluate(() => { const log = loadGamesLog(); return { scores: loadScores().length, log: log.length, tag: log[0] && log[0].tag,
    score: log[0] && log[0].score, wrong: log[0] && log[0].wrong, latest: (loadLatest() || {}).tag, ranks: gameRanks().size }; });
  t("похід у журналі ігор із тегом «quest» (1 ✓ / 1 ✗)", lb.log === 1 && lb.tag === "quest" && lb.score === 1 && lb.wrong === 1, JSON.stringify(lb));
  t("похід — «остання гра», але не в «Найкращих іграх» і не в рейтингу", lb.latest === "quest" && lb.scores === 0 && lb.ranks === 0, JSON.stringify(lb));
  const row = await p.evaluate(() => { lbActiveTab = "period"; lbPeriod = "all"; renderLeaderboard();
    const li = document.querySelector("#lb-list li.lb-latest"); return li ? { text: li.textContent, rank: li.dataset.rank || "" } : null; });
  t("у 🕒 «За весь час» похід — рядком «ост» із підписом «⚔️ Похід», без місця", row && /Похід/.test(row.text) && !row.rank, JSON.stringify(row));
  const rowW = await p.evaluate(() => { lbActiveTab = "period"; lbPeriod = "d7"; renderLeaderboard();
    return { rows: [...document.querySelectorAll("#lb-list li")].map(l => l.className + "|" + l.textContent), sum: document.getElementById("lb-period-chips").textContent }; });
  t("у 🕒 «Тиждень» похід — у рейтингу (не «ост»), у підсумку «1 похід»", rowW.rows.length === 1 && /Похід/.test(rowW.rows[0]) && !/lb-latest/.test(rowW.rows[0]) && /1 похід/.test(rowW.sum), JSON.stringify(rowW));

  // 4. Обірваний похід: утечений монстр чекає й відкриває НАСТУПНИЙ похід ареною
  await p.click("#quest-btn"); await p.waitForTimeout(200);
  await fight(); await p.waitForTimeout(200);
  const idx3 = await p.evaluate(() => Q.cur.idx);
  await p.fill("#q-answer", "абракадабра"); await p.keyboard.press("Enter"); await p.waitForTimeout(700);
  await p.reload(); await p.waitForTimeout(1200);          // похід обірвався (закрив вкладку)
  t("після обриву монстр лишився на арені", await p.evaluate(i => loadQArena().includes(wordKey(WORDS[i])), idx3));
  await p.click("#quest-btn"); await p.waitForTimeout(1000);
  t("новий похід стартує із залишком очок минулого", await p.evaluate(() => Q.answers === Q.carry && Q.carry > 0));
  t("шапка: очки як «залишок+нові» (N+0)", await p.evaluate(() => { qHud(); return /🌡️ 0 · [1-9]\d*\+0 оч\./.test(document.getElementById("q-hud-stats").textContent); }),
    await p.evaluate(() => document.getElementById("q-hud-stats").textContent));
  const pre = await p.evaluate(() => ({ stage: Q.stage, pre: Q.pre, n: document.querySelectorAll(".q-mon.lined").length, idx: Q.cur && Q.cur.idx, hint: document.getElementById("q-hint").textContent }));
  t("новий похід починається з арени недобитих", pre.stage === "arena" && pre.pre && pre.n === 1 && pre.idx === idx3, JSON.stringify(pre));
  t("підказка: «спершу добий монстрів із минулого походу»", /минулого походу/.test(pre.hint), pre.hint);
  for (let i = 0; i < 3; i++) { await p.fill("#q-answer", await right()); await p.waitForTimeout(1150); }
  await p.waitForTimeout(1300);
  t("арену добито → похід іде дорогою далі", await p.evaluate(() => Q.stage === "road" && !Q.pre && loadQArena().length === 0));
  await p.keyboard.press("Escape"); await p.waitForTimeout(300); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  // 5. Загальна статистика / прогрес: походи окремо від ігор
  const tot = await p.evaluate(() => { renderLbTotals(); renderProgressPanel(); return {
    row: [...document.querySelectorAll("#lb-totals .lb-stat-row")].map(r => r.textContent).find(x => /Походів/.test(x)) || "",
    games: [...document.querySelectorAll("#lb-totals .lb-stat-row")].map(r => r.textContent).find(x => /^🎮Ігор/.test(x)) || "",
    prog: document.getElementById("prog-list").textContent }; });
  t("у загальній статистиці окремий рядок «⚔️ Походів»", /Походів\s*2/.test(tot.row), tot.row + " | " + tot.games);
  t("у «Прогресі по днях» — значок ⚔️", /⚔️/.test(tot.prog));
  // 6. Міграція: старий похід, записаний як «гра», переїжджає в «походи»
  const mig = await p.evaluate(() => {
    const k = todayKey(), days = loadDays();
    days[k] = { correct: 12, wrong: 6, skipped: 0, games: 3 };
    localStorage.setItem("oxford_days_v1", JSON.stringify(days));
    localStorage.setItem("oxford_games_log_v1", JSON.stringify([{ score: 5, wrong: 4, skipped: 0, ts: Date.now() - 5000, tag: "cefr:A1" },
      { score: 3, wrong: 1, skipped: 0, ts: Date.now() - 3000, tag: "quest" }]));
    localStorage.removeItem("oxford_fix_quest_split_v1");
    return true; });
  await p.reload(); await p.waitForTimeout(1200);
  const m2 = await p.evaluate(() => loadDays()[todayKey()]);
  t("міграція: 3 «гри» = 1 гра + 2 походи (один — ще до журналу)", m2.games === 1 && m2.quests === 2, JSON.stringify(m2));
  t("міграція: пункти за відповіді походів (18 − 9 = 9 очок → 0 при кроці 14)", (m2.questPts || 0) === 0, JSON.stringify(m2));


  // 8б. похід, обірваний перезавантаженням, усе одно потрапляє в журнал (pagehide)
  await p.click("#quest-btn"); await p.waitForTimeout(300);
  for (let i = 0; i < 40; i++) { if (await p.evaluate(() => Q && Q.phase === "fight")) break; await p.waitForTimeout(200); }
  const nq0 = await p.evaluate(() => loadGamesLog().filter(g => g.tag === "quest").length);
  await p.fill("#q-answer", await right()); await p.waitForTimeout(400);
  await p.reload(); await p.waitForTimeout(1200);
  const nq1 = await p.evaluate(() => loadGamesLog().filter(g => g.tag === "quest").length);
  t("похід, обірваний перезавантаженням, записано в журнал (рахунок ⚔️ = рахунку днів)", nq1 === nq0 + 1, nq0 + " → " + nq1);

  // 9. переповнена арена (питання «не вийде за карту?»): 30 монстрів із довгими словами
  await p.setViewportSize({ width: 1100, height: 800 });
  await p.click("#quest-btn"); await p.waitForTimeout(400);
  const crowd = await p.evaluate(async () => {
    clearTimeout(Q.timer); const pool = [];
    for (let i = 0; pool.length < 30; i++) if (getUa(WORDS[i * 37])[0].length > 18) pool.push(i * 37);
    Q.arenaPool = pool; qArenaStart(false);
    const A = Q.arena, last = [...A.left].pop();
    A.last = null; Object.values(A.els).forEach(e => e.classList.remove("target"));
    A.els[last].classList.add("target"); A.els[last].querySelector(".qm-word").textContent = getUa(WORDS[last])[0];
    Q.cur.idx = last; qArenaLayout();
    await new Promise(r => setTimeout(r, 1300));
    const sc = document.getElementById("q-actors").getBoundingClientRect();
    const w = A.els[last].querySelector(".qm-word").getBoundingClientRect(), m = A.els[last].getBoundingClientRect();
    const mons = Object.values(A.els).map(e => e.getBoundingClientRect());
    return { inW: w.left >= sc.left && w.right <= sc.right, inM: mons.every(r => r.right <= sc.right + 1),
      top: +A.els[last].style.zIndex === Math.max(...Object.values(A.els).map(e => +e.style.zIndex)),
      rows: new Set(Object.values(A.els).map(e => e.style.bottom)).size };
  });
  t("арена на 30 монстрів: усі в межах сцени", crowd.inM, JSON.stringify(crowd));
  t("арена: бульбашка з довгим словом крайнього монстра не вилазить за край", crowd.inW, JSON.stringify(crowd));
  t("арена: ціль — поверх натовпу", crowd.top, JSON.stringify(crowd));
  t("арена: 30 монстрів стають у кілька рядів углиб (2–4)", crowd.rows >= 2 && crowd.rows <= 4, JSON.stringify(crowd));
  const few = await p.evaluate(() => { const A = Q.arena; [...A.left].slice(3).forEach(i => { A.left.delete(i); A.els[i].remove(); delete A.els[i]; }); qArenaLayout();
    return new Set(Object.values(A.els).map(e => e.style.bottom)).size; });
  t("арена: 3 монстри — один ряд", few === 1, String(few));
  // баг: вийшов з арени, не добивши → ціль (z-index 200) вилазила поверх фінальної картки
  const fin2 = await p.evaluate(async () => { questFinal(); await new Promise(r => setTimeout(r, 400));
    const c = document.getElementById("q-card"), bad = [];
    const cr = c.getBoundingClientRect();
    for (const m of document.querySelectorAll("#q-actors .q-mon")) { const r = m.getBoundingClientRect();
      const x = Math.max(cr.left + 2, Math.min(cr.right - 2, r.left + r.width / 2)), y = Math.max(cr.top + 2, Math.min(cr.bottom - 2, r.top + r.height / 2));
      const el = document.elementFromPoint(x, y); if (el && !c.contains(el)) bad.push(el.className.baseVal ?? el.className); }
    return { bad, words: [...document.querySelectorAll("#q-actors .qm-word")].map(w => w.textContent).join("") }; });
  t("вийшов з арени, не добивши — фінальна картка поверх монстрів, бульбашок нема", !fin2.bad.length && !fin2.words, JSON.stringify(fin2));

  // 8. 🏟️ Арена посеред походу (сесія 63): ≥5 втечених → кнопка; монстр відступає; Esc — назад на дорогу
  await p.evaluate(() => { localStorage.removeItem("oxford_quest_arena_v1"); });
  await p.reload(); await p.waitForTimeout(1200);
  await p.click("#quest-btn"); await fight(); await p.waitForTimeout(200);
  t("арена посеред: при 0 втечених кнопки нема", !(await p.isVisible("#q-arena-go")));
  await p.evaluate(() => { [1, 2, 3, 4].forEach(i => qArenaAdd(i)); qArenaGoBtn(); });
  t("арена посеред: при 4 втечених кнопки нема", !(await p.isVisible("#q-arena-go")));
  await p.evaluate(() => { qArenaAdd(5); qArenaGoBtn(); });
  const btn = await p.evaluate(() => ({ vis: !document.getElementById("q-arena-go").classList.contains("hidden"), txt: document.getElementById("q-arena-go").textContent, idx: Q.cur.idx, mlog: Q.mlog.length }));
  t("арена посеред: 5 втечених → кнопка «🏟️ На арену · 5»", btn.vis && /На арену · 5/.test(btn.txt), JSON.stringify(btn));
  await p.click("#q-arena-go"); await p.waitForTimeout(1200);
  const mid = await p.evaluate(() => ({ stage: Q.stage, pre: Q.pre, n: document.querySelectorAll(".q-mon.lined").length, mlog: Q.mlog.length, hint: document.getElementById("q-hint").textContent, btn: document.getElementById("q-arena-go").classList.contains("hidden") }));
  t("арена посеред: монстр відступив без зарахування, відкрилась та сама арена з 5", mid.stage === "arena" && mid.pre === "mid" && mid.n === 5 && mid.mlog === btn.mlog && mid.btn, JSON.stringify(mid));
  t("арена посеред: підказка «Esc — назад на дорогу»", /посеред походу/.test(mid.hint) && /назад на дорогу/.test(mid.hint), mid.hint);
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  const back = await p.evaluate(() => ({ stage: Q.stage, pre: Q.pre, left: qArenaPending().length }));
  t("арена посеред: Esc → назад на дорогу, недобиті чекають", back.stage === "road" && !back.pre && back.left === 5, JSON.stringify(back));
  await fight(); await p.waitForTimeout(200);
  t("арена посеред: на дорозі кнопка знову є", await p.isVisible("#q-arena-go"));

  // 🌄 краєвид за рівнями (сесія 64): шари беруться з різних тем, A1 = колишня сцена
  const sc = await p.evaluate(() => {
    const get = () => ["q-scene", "q-far", "q-near", "q-ground"].map(id => { const st = document.getElementById(id).style; return id === "q-scene" ? st.background : st.backgroundImage; });
    const one = qApplyScene(["A1"]), a1 = get(), mix = qApplyScene(["A1", "A2", "B1"]), m = get(), c2 = (qApplyScene(["C2"]), get());
    return { one, mix, a1, m, c2, sky0: /90, 167, 230|5aa7e6/i.test(a1[0]) };
  });
  t("краєвид A1 — колишнє небо", sc.sky0, sc.a1[0].slice(0, 120));
  t("A1+A2+B1: небо B1, гори A2, луг і дорога A1", sc.mix.sky === "B1" && sc.mix.far === "A2" && sc.mix.near === "A1" && sc.mix.ground === "A1", JSON.stringify(sc.mix));
  t("A1+A2+B1: пагорби = як у A1, небо інше", sc.m[2] === sc.a1[2] && sc.m[0] !== sc.a1[0]);
  t("C2 — усі шари інші, ніж у A1", sc.c2.every((x, i) => x !== sc.a1[i]));

  // бульбашка довгого слова на дорозі не перекриває героя (сесія 64) — на кількох ширинах, з обох боків
  for (const [vw, vh] of [[1920, 950], [1280, 720], [900, 700], [560, 800]]) {
    await p.setViewportSize({ width: vw, height: vh }); await p.waitForTimeout(150);
    for (const side of ["left", "right"]) {
      const r = await p.evaluate(async side => {
        if (Q.mon) Q.mon.remove();
        Q.mon = qSpawnMonster(Q.cur.idx, side);
        Q.mon.querySelector(".qm-word").textContent = "віднімання колін (вправа на прес)";
        qRoadFitWord();
        await new Promise(r => setTimeout(r, 1400));
        const w = Q.mon.querySelector(".qm-word").getBoundingClientRect(), h = document.querySelector("#q-hero svg").getBoundingClientRect(),
              sc = document.getElementById("q-actors").getBoundingClientRect();
        const hit = w.left < h.right && w.right > h.left && w.top < h.bottom && w.bottom > h.top;
        return { hit, inside: w.left >= sc.left - 1 && w.right <= sc.right + 1, w: [w.left, w.right, w.top, w.bottom].map(Math.round), h: [h.left, h.right, h.top].map(Math.round) };
      }, side);
      t("слово не лізе на героя " + vw + "px, монстр " + side, !r.hit && r.inside, JSON.stringify(r));
    }
  }

  // фінал: нижня смуга вводу схована, картка з кнопками вміщається в сцену (сесія 64)
  await p.setViewportSize({ width: 1366, height: 650 }); await p.waitForTimeout(150);
  const finFit = await p.evaluate(() => {
    Q.stage = "road"; Q.phase = "walk"; Q.counted = true;
    for (let i = 0; i < 30; i++) Q.mlog.push({ w: wordKey(WORDS[200 + i * 31]), ok: i % 2 === 0 });
    questFinal();
    const c = document.getElementById("q-card").getBoundingClientRect(), sc = document.getElementById("q-scene").getBoundingClientRect(),
          bt = document.querySelector(".qc-btns").getBoundingClientRect();
    return { bar: getComputedStyle(document.querySelector(".q-bottom")).display, fits: c.bottom <= sc.bottom + 1 && bt.bottom <= c.bottom };
  });
  t("фінал: нижня смуга схована, картка й кнопки в межах екрана", finFit.bar === "none" && finFit.fits, JSON.stringify(finFit));
  await p.evaluate(() => questClose(true)); await p.waitForTimeout(300);
  t("новий похід: нижня смуга вводу повернулась", await p.evaluate(() => getComputedStyle(document.querySelector(".q-bottom")).display !== "none"));

  console.log(bad.length ? "❌ ПРОВАЛЕНО:\n  " + bad.join("\n  ") : "✅ " + ok.length + " перевірок пройдено");
  console.log(errs.length ? "❌ помилки консолі:\n  " + errs.join("\n  ") : "✅ 0 помилок консолі");
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
