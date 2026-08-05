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

  console.log("✅ " + ok.length + " перевірок пройдено");
  if (bad.length) console.log("❌ ПРОВАЛЕНО:\n - " + bad.join("\n - "));
  console.log(errs.length ? "❌ " + errs.slice(0,3).join(" | ") : "✅ 0 помилок консолі");
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
