// Тест ⭐ ЕКСТРА-СЛІВ (сесія 64): у грі й поході рівнями CEFR інколи трапляється слово з рівня поза
// вибором (з частотою 1/N на слово, EXTRA_EVERY), лише поза «Знаю», без лічильника між випаданнями.
// Запуск: npm i playwright-core && node test-extra.js
const fs = require("fs"), path = require("path");
const PAGE = "file://" + path.join(__dirname, "index.html");
function chromium(){ for (const t of [process.env.PW_CORE,"playwright-core"].filter(Boolean)) { try { return require(t).chromium; } catch(e){} }
  console.log("⚠️  npm i playwright-core"); process.exit(2); }
function exe(){ const d=fs.readdirSync("/opt/pw-browsers").find(x=>/^chromium-\d/.test(x));
  if(!d){console.log("⚠️  немає Chromium");process.exit(2);} return "/opt/pw-browsers/"+d+"/chrome-linux/chrome"; }

(async () => {
  const b = await chromium().launch({ executablePath: process.env.PW_CHROME || exe(), args:["--no-sandbox"] });
  const p = await b.newPage({ viewport:{width:1500,height:900} }); const errs=[];
  p.addInitScript(() => { window.__QUEST_CHANCE = { phrase: 0, side: 0 }; });   // сесія 64: фраза/квест — випадкові, тут вимкнено
  p.on("pageerror", e=>errs.push(e.message));
  p.on("console", m=>{ if (m.type()==="error") errs.push(m.text()); });
  await p.goto(PAGE);
  await p.evaluate(() => { localStorage.clear();
    localStorage.setItem("oxford_cefr_sel_v1", JSON.stringify(["A1", "A2", "B1"]));
    localStorage.setItem("oxford_cefr_solo_v1", "[]");
    localStorage.setItem("oxford_train_sel_v1", JSON.stringify({ set: "cefr", dir: "ua-en" })); });
  await p.reload(); await p.waitForTimeout(1200);
  const ok=[],bad=[]; const t=(n,c,x="")=>(c?ok:bad).push(n+(x?" — "+x:""));

  // 1. частоти: 200 тис. кидків, «Знаю» не потрапляє, рівні вибору — ніколи
  const sim = await p.evaluate(() => {
    const m = loadMastery(), c2 = WORDS.findIndex(w => cefrLevelOf(w) === "C2");
    m[wordKey(WORDS[c2])] = { s: 3, c: 3, w: 0 }; localStorage.setItem(MASTERY_KEY, JSON.stringify(m));
    const X = extraInit(), N = 200000, by = {}; let known = 0, inSel = 0;
    for (let i = 0; i < N; i++) { const e = extraPick(X); if (!e) continue;
      by[e.L] = (by[e.L] || 0) + 1;
      if (mStreak(loadMastery()[wordKey(WORDS[e.idx])]) >= 3) known++;
      if (["A1", "A2", "B1"].includes(cefrLevelOf(WORDS[e.idx]))) inSel++; }
    const rate = L => (by[L] || 0) / N;
    return { levels: X.levels, total: Object.values(by).reduce((a, x) => a + x, 0) / N,
      B2: rate("B2"), C1: rate("C1"), C2: rate("C2"), none: rate("none"), known, inSel,
      c2Excluded: !X.cache.C2.includes(c2) };
  });
  t("рівні екстра = поза вибором (B2, C1, C2, —)", sim.levels.join(",") === "B2,C1,C2,none", sim.levels.join(","));
  const near = (x, p) => Math.abs(x - p) < p * 0.25;
  t("частоти ≈ 1/300 · 1/500 · 1/800 · 1/150", near(sim.B2, 1/300) && near(sim.C1, 1/500) && near(sim.C2, 1/800) && near(sim.none, 1/150), JSON.stringify(sim));
  t("разом ≈ 1,3% на слово", near(sim.total, 1/300 + 1/500 + 1/800 + 1/150), String(sim.total));
  t("слова з «Знаю» не потрапляють", sim.known === 0 && sim.c2Excluded, JSON.stringify(sim));
  t("слова обраних рівнів екстра не бувають", sim.inSel === 0);

  // 2. без лічильника: після випадання шанс той самий (кидок не залежить від історії)
  const memo = await p.evaluate(() => {
    const X = extraInit(), real = Math.random; let r;
    Math.random = () => r;
    r = 0.0005; const a = extraPick(X);           // перший відрізок (B2) — випало
    r = 0.0005; const b2 = extraPick(X);          // одразу ще раз — випадає так само
    r = 0.5; const c = extraPick(X);
    Math.random = real;
    return { a: a && a.L, b: b2 && b2.L, c };
  });
  t("після екстра-слова шанс не скидається й не росте", memo.a === "B2" && memo.b === "B2" && memo.c === null, JSON.stringify(memo));

  // 3. гра рівнями: екстра-слово з підписом ⭐, черга не з'їдається
  const game = await p.evaluate(() => {
    const real = Math.random; Math.random = () => 0.0001;
    startTraining();
    Math.random = real;
    return { lvl: cefrLevelOf(currentWord), hint: document.getElementById("mode-hint") ? document.getElementById("mode-hint").textContent : modeHintEl.textContent,
             pos: shufflePos, extra: currentExtra };
  });
  t("гра: екстра-слово з рівня поза вибором", game.extra === "B2" && game.lvl === "B2", JSON.stringify(game));
  t("гра: підпис «⭐ рідкісне слово»", /⭐ рідкісне слово B2/.test(game.hint), game.hint);
  t("гра: слот черги не з'їдено", game.pos === 0, String(game.pos));
  const plain = await p.evaluate(() => { const real = Math.random; Math.random = () => 0.9; nextWord(); Math.random = real;
    return { extra: currentExtra, hint: modeHintEl.textContent, lvl: cefrLevelOf(currentWord) }; });
  t("гра: звичайне слово — без ⭐ і з вибраних рівнів", !plain.extra && !/⭐/.test(plain.hint) && ["A1", "A2", "B1"].includes(plain.lvl), JSON.stringify(plain));
  await p.evaluate(() => endGame(true)); await p.waitForTimeout(300);
  await p.evaluate(() => { document.getElementById("end-screen").classList.add("hidden"); document.getElementById("start-screen").classList.remove("hidden"); });

  // 4. «весь словник» — екстра немає (усі рівні вже в грі)
  const all = await p.evaluate(() => { trainSet = "all"; startTraining(); const g = gameExtra; endGame(true); trainSet = "cefr"; return g; });
  t("набір «весь словник» — без екстра-слів", all === null);
  await p.evaluate(() => { document.getElementById("end-screen").classList.add("hidden"); document.getElementById("start-screen").classList.remove("hidden"); });

  // 5. похід: екстра-монстр із зірочкою
  await p.click("#quest-btn"); await p.waitForTimeout(300);
  const q = await p.evaluate(() => {
    clearTimeout(Q.timer); Q.phase = "walk"; Q.stage = "road";
    const real = Math.random; Math.random = () => 0.0001; qFight(); Math.random = real;
    return { cls: Q.mon.className, lvl: cefrLevelOf(WORDS[Q.cur.idx]), star: getComputedStyle(Q.mon.querySelector(".qm-word"), "::before").content };
  });
  t("похід: екстра-монстр з рівня поза вибором і з ⭐", /\bextra\b/.test(q.cls) && q.lvl === "B2" && /⭐/.test(q.star), JSON.stringify(q));
  await p.evaluate(() => questClose(false));

  console.log(bad.length ? "❌ ПРОВАЛЕНО:\n  " + bad.join("\n  ") : "✅ " + ok.length + " перевірок пройдено");
  console.log(errs.length ? "❌ помилки консолі:\n  " + errs.join("\n  ") : "✅ 0 помилок консолі");
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
