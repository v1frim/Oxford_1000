// Тест клікабельної комірки 🔁 у «Прогресі по днях» (архів «не дались», сесія 44).
// Запуск: npm i playwright-core && node test-wrong.js
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

  // 1. архів пише слово один раз, скільки б разів на ньому не спіткнутись
  const arch = await p.evaluate(() => {
    addDayWrong(0); addDayWrong(0); addDayWrong(1);
    return { day: loadDayWrong()[todayKey()], keys: dayWrongKeys(todayKey()).length };
  });
  t("архів пише слово один раз", arch.keys === 2, JSON.stringify(arch.day));

  // 2. закриття боргу НЕ стирає архів (у цьому вся суть)
  const kept = await p.evaluate(() => {
    addDayMistake(0); removeDayMistake(0);              // борг закрито повторенням
    return { mistakes: allDayMistakeKeys().length, archive: dayWrongKeys(todayKey()).length };
  });
  t("борг закрито, архів лишився", kept.mistakes === 0 && kept.archive === 2, JSON.stringify(kept));

  // 3. комірка 🔁 стала клікабельною і має data-атрибути
  const cell = await p.evaluate(() => {
    const html = _progDeltaHtml(0, 0, 47, 0, todayKey());
    const d = document.createElement("div"); d.innerHTML = html;
    const c = d.querySelector(".lb-review");
    return { click: c.classList.contains("prog-click"), cat: c.dataset.tcat, date: c.dataset.tdate,
             val: c.querySelector(".pgc-v").textContent, title: c.getAttribute("title") };
  });
  t("комірка 🔁 клікабельна", cell.click === true);
  t("категорія «r» і дата", cell.cat === "r" && !!cell.date, JSON.stringify(cell));
  t("число лишилось = повторення", cell.val === "+47", cell.val);
  t("підказка пояснює обидва числа", /47 повторень/.test(cell.title) && /2 слів/.test(cell.title), cell.title);

  // 4. день без повторень, але з помилками — комірка все одно є
  const noRev = await p.evaluate(() => {
    const d = document.createElement("div");
    d.innerHTML = _progDeltaHtml(0, 0, 0, 0, todayKey());
    const c = d.querySelector(".lb-review");
    return c ? c.querySelector(".pgc-v").textContent : null;
  });
  t("без повторень показує кількість слів", noRev === "2", String(noRev));

  // 5. модалка відкривається і показує УНІКАЛЬНІ слова + грає їх
  const modal = await p.evaluate(() => {
    openDayTransModal(todayKey(), "r");
    const vis = !document.getElementById("cat-modal").classList.contains("hidden");
    return { vis, rows: document.querySelectorAll("#cat-list .cat-row").length,
             title: document.getElementById("cat-title").textContent,
             pool: catModalCustomPool ? catModalCustomPool.length : 0, tag: catModalPoolTag };
  });
  t("модалка «не дались» відкрилась", modal.vis === true);
  t("рядків = унікальних слів", modal.rows === 2, String(modal.rows));
  t("заголовок із датою", /Не дались/.test(modal.title), modal.title);
  t("пул для гри готовий", modal.pool >= 2, String(modal.pool));
  t("тег пулу = wrong", modal.tag === "wrong", String(modal.tag));

  // 6. гра з такого пулу — поза топ-10, але з підписом у лозі
  const lb = await p.evaluate(() => {
    localStorage.setItem("oxford_scores_v1", "[]");
    localStorage.setItem("oxford_games_log_v1", "[]");
    setMode("ua-en");
    startGame([0,1], { timed: true, tag: "wrong" });
    score = 9; endGame(true);
    return { top: JSON.parse(localStorage.getItem("oxford_scores_v1") || "[]").length,
             log: JSON.parse(localStorage.getItem("oxford_games_log_v1") || "[]").map(g => g.tag) };
  });
  t("гра «не дались» НЕ в топ-10", lb.top === 0, String(lb.top));
  t("але лишилась у лозі з тегом", lb.log.includes("wrong"), JSON.stringify(lb.log));

  console.log("✅ " + ok.length + " перевірок пройдено");
  if (bad.length) console.log("❌ ПРОВАЛЕНО:\n - " + bad.join("\n - "));
  console.log(errs.length ? "❌ помилки консолі:\n - " + errs.slice(0,4).join("\n - ") : "✅ 0 помилок консолі");
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
