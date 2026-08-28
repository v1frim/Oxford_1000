// Тест напрямків у ПОВТОРЕННІ помилок після гри (сесія 53, за запитом користувача).
// Привід: три правильні на слово приходили одним боком — `dictionary` тричі UA→US,
// `traveler` тричі US→UA. Тепер напрямок роздає план 2+1, а не монетка.
// Запуск: npm i playwright-core && node test-review.js
const fs = require("fs"), path = require("path");
const PAGE = "file://" + path.join(__dirname, "index.html");
function chromium(){ for (const t of [process.env.PW_CORE,"playwright-core"].filter(Boolean)) { try { return require(t).chromium; } catch(e){} }
  console.log("⚠️  npm i playwright-core"); process.exit(2); }
function exe(){ const d=fs.readdirSync("/opt/pw-browsers").find(x=>/^chromium-\d/.test(x));
  if(!d){console.log("⚠️  немає Chromium");process.exit(2);} return "/opt/pw-browsers/"+d+"/chrome-linux/chrome"; }

(async () => {
  const b = await chromium().launch({ executablePath: exe(), args:["--no-sandbox"] });
  const p = await b.newPage({ viewport:{width:1500,height:1000} }); const errs=[];
  p.on("pageerror", e=>errs.push(e.message)); p.on("console", m=>{ if(m.type()==="error") errs.push(m.text()); });
  await p.goto(PAGE); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1100);
  const ok=[],bad=[]; const t=(n,c,x="")=>(c?ok:bad).push(n+(x?" — "+x:""));

  // 1. План: кожне слово дістає обидва напрямки, розкладом 2+1
  const plan = await p.evaluate(() => {
    const pool = [0,1,2,3,4,5];
    const pl = buildReviewDirPlan(pool);
    return pool.map(i => pl[i]);
  });
  t("план на кожне слово має 3 кроки", plan.every(x => x.length === 3), JSON.stringify(plan));
  t("у кожному плані ОБИДВА напрямки",
    plan.every(x => x.includes("en-ua") && x.includes("ua-en")), JSON.stringify(plan));
  t("розклад саме 2+1, а не 3+0",
    plan.every(x => { const n = x.filter(d => d === "en-ua").length; return n === 1 || n === 2; }),
    JSON.stringify(plan));
  t("основний напрямок чергується між словами",
    plan.every((x, i) => x.filter(d => d === (i % 2 ? "ua-en" : "en-ua")).length === 2),
    JSON.stringify(plan));

  // 2. Порядок усередині трійки НЕ фіксований (інакше меншість завжди третя)
  const orders = await p.evaluate(() => {
    const seen = new Set();
    for (let k = 0; k < 60; k++) seen.add(buildReviewDirPlan([7])[7].join(","));
    return [...seen];
  });
  t("порядок кроків перемішується", orders.length > 1, orders.join(" | "));

  // 3. Живий прогін: напрямок береться з плану за лічильником ПРАВИЛЬНИХ
  const live = await p.evaluate(() => {
    // ⚠️ `reviewDir` ВИСТАВЛЯЄМО ДО startGame: перше питання малює вже він сам.
    // Саме так це робить `startReview()` — повторення після гри завжди «random».
    reviewDir = "random";
    startGame([0, 1]);                       // review-пул: 3 правильні на слово
    const out = [];
    for (let step = 0; step < 6; step++) {
      out.push({ w: currentWordIndex, mode: mode,
                 want: reviewDirPlan[currentWordIndex][(reviewCorrectCounts[currentWordIndex] || 0) % 3] });
      reviewCorrectCounts[currentWordIndex] = (reviewCorrectCounts[currentWordIndex] || 0) + 1;
      if (reviewCorrectCounts[currentWordIndex] >= 3) reviewRemaining.delete(currentWordIndex);
      if (reviewRemaining.size) nextWord();
    }
    const byWord = {};
    out.forEach(o => { (byWord[o.w] = byWord[o.w] || []).push(o.mode); });
    return { out, byWord };
  });
  t("напрямок питання = крок плану",
    live.out.every(o => o.mode === o.want), JSON.stringify(live.out));
  t("кожне слово прогнали обома напрямками",
    Object.values(live.byWord).every(ms => ms.includes("en-ua") && ms.includes("ua-en")),
    JSON.stringify(live.byWord));
  t("жодне слово не пройшло тричі одним боком",
    Object.values(live.byWord).every(ms => new Set(ms).size === 2), JSON.stringify(live.byWord));

  // 4. Явно обраний напрямок план НЕ перебиває (модалка EN→UA / UA→EN)
  const fixed = await p.evaluate(() => {
    reviewDir = "ua-en";
    startGame([0, 1]);
    mode = "ua-en";
    const seen = [];
    for (let k = 0; k < 5; k++) { nextWord(); seen.push(mode); }
    return seen;
  });
  t("обраний напрямок лишається сталим", fixed.every(m => m === "ua-en"), fixed.join(","));

  // 5. Звичайна гра плану не має взагалі
  const normal = await p.evaluate(() => { startGame(); return reviewDirPlan; });
  t("у звичайній грі план скинуто", normal === null, JSON.stringify(normal));

  console.log(bad.length ? "❌ ПРОВАЛЕНО:\n - " + bad.join("\n - ") : "✅ " + ok.length + " перевірок пройдено");
  console.log(errs.length ? "❌ " + errs.slice(0,3).join(" | ") : "✅ 0 помилок консолі");
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
