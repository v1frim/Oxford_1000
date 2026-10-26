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
  await p.keyboard.press("Enter"); await p.waitForTimeout(200);
  t("Enter — «Готово», почалось повторення", await p.evaluate(() => Q.phase === "drill"));
  const dirs = [];
  await p.fill("#q-answer", await right()); await p.waitForTimeout(250);
  t("правильна в повторенні — лічильник 1", await p.evaluate(() => Q.drill.n === 1));
  t("правильна в повторенні — герой б'є монстра", await p.evaluate(() => document.getElementById("q-hero").classList.contains("strike") && Q.mon.classList.contains("hit")));
  await p.fill("#q-answer", "ні"); await p.keyboard.press("Enter"); await p.waitForTimeout(120);
  t("помилка в повторенні — монстр б'є героя", await p.evaluate(() => document.getElementById("q-hero").classList.contains("hurt") && Q.mon.classList.contains("strike-back")));
  await p.waitForTimeout(1800);
  t("помилка в повторенні НЕ обнуляє лічильник (3 правильні не обов'язково поспіль)", await p.evaluate(() => Q.drill.n === 1 && Q.phase === "drill"));
  const xpBeforeDrill = await p.evaluate(() => loadXp());
  for (let i = 0; i < 2; i++) { dirs.push(await p.evaluate(() => mode)); await p.fill("#q-answer", await right()); await p.waitForTimeout(250); }
  t("повторення — в обидва боки", new Set(dirs).size === 2, dirs.join(","));
  t("після 3 правильних — втеча", await p.evaluate(() => Q.phase === "flee" || Q.phase === "walk"));
  t("вивчене посеред походу слово = +1 XP", (await p.evaluate(() => loadXp())) - xpBeforeDrill === 1);
  t("журнал для перерахунку XP: день.questDrill = 1", (await day()).questDrill === 1);
  t("повторення посеред походу mastery НЕ чіпає", await p.evaluate(i => mStreak(loadMastery()[wordKey(WORDS[i])]) === 0, idx2));

  // 3. стоп → арена
  await fight(); await p.waitForTimeout(200);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const pause = await p.evaluate(() => document.getElementById("q-card").textContent);
  t("Esc — привал із правильними / неправильними", /1\s*правильних/.test(pause) && /1\s*неправильних/.test(pause), pause.slice(0, 80));
  t("на привалі кличе на арену", /На арену/.test(pause));
  await p.keyboard.press("Enter"); await p.waitForTimeout(900);
  const ar = await p.evaluate(() => ({ stage: Q.stage, n: document.querySelectorAll(".q-mon.lined").length, target: Q.cur.idx }));
  t("арена: у ряд стоять ті, від кого втік", ar.stage === "arena" && ar.n === 1, JSON.stringify(ar));
  t("на арені — саме втечене слово", ar.target === idx2);
  for (let i = 0; i < 3; i++) { await p.fill("#q-answer", await right()); await p.waitForTimeout(1100); }
  await p.waitForTimeout(1200);
  const fin = await p.evaluate(() => ({ stage: Q && Q.stage, card: document.getElementById("q-card").textContent, xp: qXp(), real: loadXp() - Q.xp0 }));
  t("3 правильні на арені — монстр добитий, фінал", fin.stage === "final" && /Похід завершено/.test(fin.card), fin.stage);
  t("XP походу = реальний приріст (1 перемога + 1 вивчення + 2 арена + бонуси mastery)", fin.xp === fin.real && fin.real >= 3 && fin.real - xp0 * 0 === (await p.evaluate(() => loadXp())) - xp0, fin.xp + " / " + fin.real);
  d = await day();
  t("арена = +1 «Повторень» дня", d.reviewCorrect === 1, JSON.stringify(d));
  t("добитий на арені монстр зник зі збереженої арени", await p.evaluate(() => loadQArena().length === 0));
  const pts = await p.evaluate(() => ({ need: [1,2,3,4,5,6,7].map(questPointNeed).join(","), d: loadDays()[todayKey()].questPts || 0,
    ans: Q.answers, q: Q.pts, exp: questPointsFor(Q.answers), at10: questPointsFor(10), at45: questPointsFor(45), at62: questPointsFor(62) }));
  t("пункти «Плани»: 8·16·24·32·40, далі кожні 10", pts.need === "8,16,24,32,40,50,60" && pts.at10 === 1 && pts.at45 === 5 && pts.at62 === 7, JSON.stringify(pts));
  // очки: монстр ✓ (1) + монстр ✗ (1) + завершене повторення (1) + добитий на арені (1) = 4;
  // помилки в повторенні й на арені очок НЕ дають
  t("очки походу: відповідь монстру + завершене повторення + добитий на арені = 4", pts.ans === 4, JSON.stringify(pts));
  t("пункти = очки / сходинки (і записані в день)", pts.q === pts.exp && pts.d === pts.q, JSON.stringify(pts));
  await p.keyboard.press("Enter"); await p.waitForTimeout(400);
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
  const row = await p.evaluate(() => { lbActiveTab = "period"; renderLeaderboard();
    const li = document.querySelector("#lb-list li.lb-latest"); return li ? { text: li.textContent, rank: li.dataset.rank || "" } : null; });
  t("у 🕒 похід — рядком «ост» із підписом «⚔️ Похід», без місця", row && /Похід/.test(row.text) && !row.rank, JSON.stringify(row));

  // 4. Обірваний похід: утечений монстр чекає й відкриває НАСТУПНИЙ похід ареною
  await p.click("#quest-btn"); await p.waitForTimeout(200);
  await fight(); await p.waitForTimeout(200);
  const idx3 = await p.evaluate(() => Q.cur.idx);
  await p.fill("#q-answer", "абракадабра"); await p.keyboard.press("Enter"); await p.waitForTimeout(700);
  await p.reload(); await p.waitForTimeout(1200);          // похід обірвався (закрив вкладку)
  t("після обриву монстр лишився на арені", await p.evaluate(i => loadQArena().includes(wordKey(WORDS[i])), idx3));
  await p.click("#quest-btn"); await p.waitForTimeout(1000);
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
  t("міграція: пункти за відповіді походів (18 − 9 = 9 → 1)", m2.questPts === 1, JSON.stringify(m2));

  console.log(bad.length ? "❌ ПРОВАЛЕНО:\n  " + bad.join("\n  ") : "✅ " + ok.length + " перевірок пройдено");
  console.log(errs.length ? "❌ помилки консолі:\n  " + errs.join("\n  ") : "✅ 0 помилок консолі");
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
