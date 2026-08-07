// Тест інтервального повторення помилок (борг за помилку, сесія 44).
// Запуск: npm i playwright-core && node test-due.js   (або PW_CORE=... node test-due.js)
const fs = require("fs"), path = require("path");
const PAGE = "file://" + path.join(__dirname, "index.html");
function chromium(){ for (const t of [process.env.PW_CORE,"playwright-core"].filter(Boolean)) { try { return require(t).chromium; } catch(e){} }
  console.log("⚠️  npm i playwright-core"); process.exit(2); }
function exe(){ const d=fs.readdirSync("/opt/pw-browsers").find(x=>/^chromium-\d/.test(x));
  if(!d){console.log("⚠️  немає Chromium");process.exit(2);} return "/opt/pw-browsers/"+d+"/chrome-linux/chrome"; }

(async () => {
  const b = await chromium().launch({ executablePath: exe(), args:["--no-sandbox"] });
  const p = await b.newPage(); const errs=[];
  p.on("pageerror", e=>errs.push(e.message));
  await p.goto(PAGE); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1000);
  const ok=[],bad=[]; const t=(n,c,x="")=>(c?ok:bad).push(n+(x?" — "+x:""));

  // 1. помилка ставить борг на ЗАВТРА, а не на сьогодні
  const sched = await p.evaluate(() => {
    scheduleDue(0);
    const d = JSON.parse(localStorage.getItem("oxford_due_v1"));
    return { rec: d[wordKey(WORDS[0])], today: todayKey(), tomorrow: tomorrowKey(), dueNow: dueNowKeys().length };
  });
  t("борг записано на завтра", sched.rec.due === sched.tomorrow, JSON.stringify(sched.rec));
  t("сьогодні слово ще НЕ на повторенні", sched.dueNow === 0, String(sched.dueNow));

  // 2. настав день Х → слово в черзі
  const ready = await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("oxford_due_v1"));
    d[wordKey(WORDS[0])].due = "2000-01-01";           // «учорашня» помилка
    localStorage.setItem("oxford_due_v1", JSON.stringify(d));
    return dueNowKeys().length;
  });
  t("наступного дня слово в черзі", ready === 1, String(ready));

  // 3. розкид: 6 боргових слів НЕ валяться в одну гру
  const spread = await p.evaluate(() => {
    const d = {};
    for (let i = 0; i < 6; i++) d[wordKey(WORDS[i])] = { due: "2000-01-01", waited: 0 };
    localStorage.setItem("oxford_due_v1", JSON.stringify(d));
    const perGame = [];
    for (let g = 0; g < 8; g++) perGame.push(pickDueIndices().length);
    return { perGame, max: Math.max(...perGame), total: perGame.reduce((a,c)=>a+c,0) };
  });
  t("не більше 3 боргових слів у грі", spread.max <= 3, JSON.stringify(spread.perGame));
  t("слова розтягнулись на кілька ігор", spread.perGame.filter(n=>n>0).length >= 2, JSON.stringify(spread.perGame));

  // 4. слово не губиться: за 8 ігор кожне взяли хоч раз (примусово після 4 пропусків)
  const forced = await p.evaluate(() => {
    const d = {};
    for (let i = 0; i < 4; i++) d[wordKey(WORDS[i])] = { due: "2000-01-01", waited: 0 };
    localStorage.setItem("oxford_due_v1", JSON.stringify(d));
    const seen = new Set();
    for (let g = 0; g < 8; g++) pickDueIndices().forEach(i => seen.add(i));
    return seen.size;
  });
  t("жодне слово не загубилось за 8 ігор", forced === 4, String(forced));

  // 5. правильна відповідь у грі закриває борг (1 підмішування досить)
  const cleared = await p.evaluate(() => {
    localStorage.setItem("oxford_due_v1", JSON.stringify({ [wordKey(WORDS[3])]: { due: "2000-01-01", waited: 9 } }));
    startGame();                                        // звичайна гра — борг підмішується
    const injected = dueThisGame && dueThisGame.has(3);
    clearDue(3);
    const left = Object.keys(JSON.parse(localStorage.getItem("oxford_due_v1"))).length;
    endGame(true);
    return { injected, left };
  });
  t("боргове слово підмішалось у гру", cleared.injected === true);
  t("правильна відповідь закриває борг", cleared.left === 0, String(cleared.left));

  // 6. у повторенні помилок борг НЕ підмішується
  const inReview = await p.evaluate(() => {
    localStorage.setItem("oxford_due_v1", JSON.stringify({ [wordKey(WORDS[5])]: { due: "2000-01-01", waited: 9 } }));
    startGame([1,2], {});                               // activePool → режим повторення
    const n = dueThisGame ? dueThisGame.size : -1;
    endGame(true);
    return n;
  });
  t("у повторенні борг не підмішується", inReview === 0, String(inReview));

  // ── СЕСІЯ 45: борг — ЄДИНИЙ механізм повернення помилок ────────────────────
  // 7. кнопки «📒 Помилки» і механіки пунктів «15 закритих = 1» більше нема
  const gone = await p.evaluate(() => ({
    btn:  !!document.getElementById("review-today-btn"),
    upd:  typeof updateReviewTodayBtn,
    rec:  typeof recordMistakeReviews,
    load: typeof loadMistakeReviews,          // читач історії — МАЄ лишитись
  }));
  t("кнопки «📒 Помилки» нема в DOM", gone.btn === false);
  t("updateReviewTodayBtn видалено", gone.upd === "undefined", gone.upd);
  t("recordMistakeReviews видалено", gone.rec === "undefined", gone.rec);
  t("loadMistakeReviews (історія) лишився", gone.load === "function", gone.load);

  // 8. Пробіл на старт-екрані більше нічого не запускає
  const spaceNoop = await p.evaluate(() => {
    document.getElementById("start-screen").classList.remove("hidden");
    document.getElementById("game").classList.add("hidden");
    return document.getElementById("game").classList.contains("hidden");
  });
  await p.keyboard.press(" ");
  await p.waitForTimeout(150);
  const stillMenu = await p.evaluate(() => document.getElementById("game").classList.contains("hidden"));
  t("Пробіл на старт-екрані не стартує повторення", spaceNoop && stillMenu);

  // 9. одноразовий засів: старий «відкритий борг» помилок → борг (due = сьогодні)
  await p.evaluate(() => {
    localStorage.removeItem("oxford_due_seed_v1");
    localStorage.setItem("oxford_due_v1", "{}");
    localStorage.setItem("oxford_day_mistakes_v1", JSON.stringify({ "2000-01-02": [wordKey(WORDS[7])] }));
  });
  await p.reload(); await p.waitForTimeout(800);
  const seeded = await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("oxford_due_v1"));
    return { rec: d[wordKey(WORDS[7])], today: todayKey(), flag: localStorage.getItem("oxford_due_seed_v1"), dueNow: dueNowKeys().length };
  });
  t("стара помилка стала боргом", !!seeded.rec, JSON.stringify(seeded.rec));
  t("засів ставить due = сьогодні", seeded.rec && seeded.rec.due === seeded.today, JSON.stringify(seeded.rec));
  t("слово одразу в черзі на підмішування", seeded.dueNow === 1, String(seeded.dueNow));
  t("прапор засіву виставлено", seeded.flag === "1", String(seeded.flag));

  // 10. засів одноразовий і не чіпає слова, що вже в борзі (на завтра)
  const reseed = await p.evaluate(() => {
    localStorage.setItem("oxford_due_v1", JSON.stringify({ [wordKey(WORDS[8])]: { due: tomorrowKey(), waited: 0 } }));
    localStorage.setItem("oxford_day_mistakes_v1", JSON.stringify({ [todayKey()]: [wordKey(WORDS[8])] }));
    seedDueFromMistakes();                                    // прапор уже стоїть → no-op
    const d1 = JSON.parse(localStorage.getItem("oxford_due_v1"));
    localStorage.removeItem("oxford_due_seed_v1");
    seedDueFromMistakes();                                    // навіть без прапора не зсуває наявний борг
    const d2 = JSON.parse(localStorage.getItem("oxford_due_v1"));
    return { first: d1[wordKey(WORDS[8])].due, second: d2[wordKey(WORDS[8])].due, tomorrow: tomorrowKey() };
  });
  t("повторний засів не зсуває наявний борг", reseed.first === reseed.tomorrow && reseed.second === reseed.tomorrow, JSON.stringify(reseed));

  // 10b. ⚠️ ПОМИЛКА В ПОВТОРЕННІ НЕ СТАВИТЬ БОРГ (фікс сесії 45).
  // Було навпаки: кожна затинка в дрилі «3 правильні поспіль» лізла в чергу.
  const fromReview = await p.evaluate(() => {
    localStorage.setItem("oxford_due_v1", "{}");
    localStorage.setItem("oxford_day_mistakes_v1", "{}");
    startGame([1, 2], {});                       // activePool → режим повторення
    currentWordIndex = 1; currentWord = WORDS[1]; currentShown = getEn(WORDS[1])[0];
    recordAnswer("хибна відповідь", "wrong");
    const afterReview = Object.keys(JSON.parse(localStorage.getItem("oxford_due_v1"))).length;
    endGame(true);
    startGame();                                 // звичайна timed-гра
    currentWordIndex = 2; currentWord = WORDS[2]; currentShown = getEn(WORDS[2])[0];
    recordAnswer("хибна відповідь", "wrong");
    const afterGame = Object.keys(JSON.parse(localStorage.getItem("oxford_due_v1"))).length;
    endGame(true);
    return { afterReview, afterGame };
  });
  t("помилка в ПОВТОРЕННІ не ставить борг", fromReview.afterReview === 0, String(fromReview.afterReview));
  t("помилка у звичайній грі борг ставить", fromReview.afterGame === 1, String(fromReview.afterGame));

  // 10c. одноразовий ремонт: у борзі лишається тільки те, що досі відкрита помилка
  await p.evaluate(() => {
    localStorage.removeItem("oxford_due_fix_v1");
    localStorage.setItem("oxford_due_v1", JSON.stringify({
      [wordKey(WORDS[10])]: { due: "2000-01-01", waited: 0 },   // відкрита помилка — лишиться
      [wordKey(WORDS[11])]: { due: "2000-01-01", waited: 0 },   // сміття з повторення — піде
    }));
    localStorage.setItem("oxford_day_mistakes_v1", JSON.stringify({ "2000-01-03": [wordKey(WORDS[10])] }));
  });
  await p.reload(); await p.waitForTimeout(900);
  const repaired = await p.evaluate(() => ({
    keys: Object.keys(JSON.parse(localStorage.getItem("oxford_due_v1"))),
    kept: wordKey(WORDS[10]), dropped: wordKey(WORDS[11]),
    flag: localStorage.getItem("oxford_due_fix_v1"),
  }));
  t("ремонт лишив відкриту помилку", repaired.keys.includes(repaired.kept), JSON.stringify(repaired.keys));
  t("ремонт прибрав сміття з повторень", !repaired.keys.includes(repaired.dropped), JSON.stringify(repaired.keys));
  t("прапор ремонту виставлено", repaired.flag === "1", String(repaired.flag));

  // 11. вгадане боргове слово чиститься і з «відкритого боргу» помилок
  const drained = await p.evaluate(() => {
    const wk = wordKey(WORDS[4]);
    localStorage.setItem("oxford_due_v1", JSON.stringify({ [wk]: { due: "2000-01-01", waited: 9 } }));
    localStorage.setItem("oxford_day_mistakes_v1", JSON.stringify({ "2000-01-01": [wk] }));
    startGame();
    const injected = dueThisGame && dueThisGame.has(4);
    currentWordIndex = 4; currentWord = WORDS[4]; currentShown = getEn(WORDS[4])[0];
    recordAnswer(getUa(WORDS[4])[0], "correct");              // «вгадав» боргове слово
    const out = { injected, due: Object.keys(JSON.parse(localStorage.getItem("oxford_due_v1"))).length,
                  mistakes: allDayMistakeKeys().length };
    endGame(true);
    return out;
  });
  t("боргове слово підмішалось (drain)", drained.injected === true);
  t("вгадане слово знято з боргу", drained.due === 0, String(drained.due));
  t("вгадане слово знято з «відкритого боргу» помилок", drained.mistakes === 0, String(drained.mistakes));

  console.log("✅ " + ok.length + " перевірок пройдено");
  if (bad.length) console.log("❌ ПРОВАЛЕНО:\n - " + bad.join("\n - "));
  console.log(errs.length ? "❌ " + errs.slice(0,3).join(" | ") : "✅ 0 помилок консолі");
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
