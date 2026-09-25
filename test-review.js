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

  // 1. План: у кожного слова обидва напрямки, і третій крок — гарантія
  const plan = await p.evaluate(() => {
    const pool = Array.from({ length: 200 }, (_, i) => i);
    const pl = buildReviewDirPlan(pool);
    return pool.map(i => pl[i]);
  });
  t("план на кожне слово має 3 кроки", plan.every(x => x.length === 3), JSON.stringify(plan[0]));
  t("у кожному плані є ОБИДВА напрямки",
    plan.every(x => x.includes("en-ua") && x.includes("ua-en")),
    JSON.stringify(plan.filter(x => new Set(x).size === 1).slice(0, 3)));
  // ⚠️ Наслідок, а не окреме правило: три слоти + обидва напрямки = завжди 2+1
  t("у трійці завжди 2+1, а не 3+0",
    plan.every(x => { const n = x.filter(d => d === "en-ua").length; return n === 1 || n === 2; }),
    JSON.stringify(plan[0]));
  // ⚠️ ГОЛОВНЕ ПРАВИЛО (уточнення користувача): третій крок примусовий ЛИШЕ тоді,
  // коли перші два збіглися; інакше він вільний.
  t("збіглися перші два → третій обов'язково інший",
    plan.filter(x => x[0] === x[1]).every(x => x[2] !== x[0]),
    JSON.stringify(plan.filter(x => x[0] === x[1] && x[2] === x[0]).slice(0, 3)));
  // 2. Перші два кроки — ЧЕСНА монетка: на великій вибірці мають трапитись усі 4 пари
  const pairs = new Set(plan.map(x => x[0] + "," + x[1]));
  t("перші два кроки не примусові — усі 4 комбінації трапляються",
    pairs.size === 4, [...pairs].join(" | "));
  const freeThird = plan.filter(x => x[0] !== x[1]);
  t("коли перші два різні — третій теж вільний",
    new Set(freeThird.map(x => x[2])).size === 2,
    JSON.stringify(freeThird.slice(0, 3)));

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

  // ── 6. XP ЗА ПОВТОРЕННЯ ПОВЕРНУТО (сесія 60, прямий запит) ──────────────────────────
  // «по закінченню раунду я ще окремо приділяю час на повторення, і не зараховувати цей
  // час було би неправильно». Сесія 55 знімала і +2 XP, і журнал `reviewCorrect` — тепер
  // обидва назад. Головна перевірка — ІНВАРІАНТ ПАРИ: живий XP за повторення мусить
  // дорівнювати 2 × записаному `reviewCorrect`, інакше перерахунок formula_vN його з'їсть.
  const xp = await p.evaluate(() => {
    const today = todayKey();
    const days0 = JSON.parse(localStorage.getItem("oxford_days_v1") || "{}");
    const rc0 = (days0[today] || {}).reviewCorrect || 0;
    const xp0 = loadXp(), day0 = getDayXpGain(today);
    const hit = i => { currentWordIndex = i; currentWord = WORDS[i]; currentShown = getEn(WORDS[i])[0];
                       recordAnswer(getUa(WORDS[i])[0], "correct"); };
    const miss = i => { currentWordIndex = i; currentWord = WORDS[i]; currentShown = getEn(WORDS[i])[0];
                        recordAnswer("хиба", "wrong"); };
    setMode("en-ua");
    startGame([300, 301, 302], {});                 // post-game повторення, 3 слова
    // 300 — чисто закрите; 301 — із затинкою, але теж закрите (tainted); 302 — лише 2 правильні
    hit(300); hit(300); const afterTwo = loadXp() - xp0; hit(300);
    const afterClose = loadXp() - xp0;
    miss(301); hit(301); hit(301); hit(301);
    hit(302); hit(302);
    const liveXp = loadXp() - xp0;
    endGame(true);
    const days1 = JSON.parse(localStorage.getItem("oxford_days_v1") || "{}");
    const rc1 = (days1[today] || {}).reviewCorrect || 0;
    // порожнє повторення нічого не пише
    startGame([303], {}); endGame(true);
    const days2 = JSON.parse(localStorage.getItem("oxford_days_v1") || "{}");
    return { afterTwo, afterClose, liveXp, dRc: rc1 - rc0, dayXp: getDayXpGain(today) - day0,
             rc2: (days2[today] || {}).reviewCorrect || 0, rc1,
             mastery: loadMastery()[wordKey(WORDS[300])] };
  });
  t("дві правильні ще не закривають слово — XP 0", xp.afterTwo === 0, String(xp.afterTwo));
  t("третя правильна закриває слово — рівно +2 XP", xp.afterClose === 2, String(xp.afterClose));
  t("слово із затинкою, закрите трьома правильними, теж +2", xp.liveXp === 4, "усього " + xp.liveXp);
  t("незакрите слово (2 з 3) XP не дає", xp.liveXp === 4, "усього " + xp.liveXp);
  t("endGame записав reviewCorrect = 2 закриті слова", xp.dRc === 2, String(xp.dRc));
  t("⚠️ ІНВАРІАНТ ПАРИ: живий XP == 2 × reviewCorrect", xp.liveXp === 2 * xp.dRc,
    xp.liveXp + " vs 2×" + xp.dRc);
  t("денний XP (⚡ у «Прогресі») виріс на ті самі 4", xp.dayXp === 4, String(xp.dayXp));
  t("повторення без закритих слів нічого не пише", xp.rc2 === xp.rc1, xp.rc1 + " → " + xp.rc2);
  t("повторення НЕ чіпає mastery (streak лишається за грою)", xp.mastery === undefined, JSON.stringify(xp.mastery));

  console.log(bad.length ? "❌ ПРОВАЛЕНО:\n - " + bad.join("\n - ") : "✅ " + ok.length + " перевірок пройдено");
  console.log(errs.length ? "❌ " + errs.slice(0,3).join(" | ") : "✅ 0 помилок консолі");
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
