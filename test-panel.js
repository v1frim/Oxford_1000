// Тест перебудованої центральної панелі + модалки «Тренування» (сесія 44).
// Запуск: npm i playwright-core && node test-panel.js
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

  // 1. панель: головна кнопка з підписом, ряди «Щодня» та English-only
  t("головна кнопка видима", await p.isVisible("#start-btn"));
  t("підпис показує набір і напрямок", /·/.test(await p.textContent("#start-sub")), await p.textContent("#start-sub"));
  for (const id of ["duo-btn","lh-btn","songs-btn","expr-btn","movie-btn"])
    t("у ряду «Щодня» є #"+id, await p.isVisible("#"+id));
  // «−» показується лише коли є що скасовувати за сьогодні (стара логіка renderDuoBtn)
  const duoMinus = await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("oxford_duolingo_v1") || "{}");
    s[duoToday()] = 2; localStorage.setItem("oxford_duolingo_v1", JSON.stringify(s));
    renderDuoBtn();
    return { minus: document.getElementById("duo-minus").style.display !== "none",
             cnt: document.getElementById("duo-count").textContent };
  });
  t("Duolingo рахує сесії за сьогодні", duoMinus.cnt === "2", duoMinus.cnt);
  t("Duolingo має «−», коли є що скасувати", duoMinus.minus);
  for (const id of ["btn-en-def","btn-en-syn","btn-en-ant","btn-en-cloze"])
    t("English-only: #"+id, await p.isVisible("#"+id));
  t("старих кнопок напрямку нема", await p.$("#btn-ua-en") === null && await p.$("#cefr-btn") === null);

  // 2. кіно: поріг 1500 і замок
  const mv = await p.evaluate(() => ({ lim: MOVIE_UNLOCK_KNOWN, txt: document.getElementById("movie-btn").textContent }));
  t("поріг кіно = 1500", mv.lim === 1500, String(mv.lim));
  t("кнопка кіно показує прогрес", /1500/.test(mv.txt), mv.txt);

  // 3. модалка «Тренування» відкривається кнопкою, Shift і Enter
  await p.click("#start-btn"); await p.waitForTimeout(200);
  t("модалка відкрилась кліком", await p.isVisible("#train-modal"));
  t("три набори слів", (await p.$$(".tm-set")).length === 3);
  t("два напрямки, без «Випадкового»", (await p.$$(".tm-dir")).length === 2);
  t("рядок рівнів видно для CEFR", await p.isVisible("#tm-levels"));

  // 4. Shift перемикає напрямок
  const d1 = await p.evaluate(()=>trainDir);
  await p.keyboard.press("Shift"); await p.waitForTimeout(150);
  const d2 = await p.evaluate(()=>trainDir);
  t("Shift перемикає напрямок", d1 !== d2, d1+" → "+d2);

  // 5. стрілки перемикають набір; для «весь словник» рівні ховаються
  await p.keyboard.press("ArrowRight"); await p.waitForTimeout(150);
  t("стрілка змінила набір на «весь словник»", await p.evaluate(()=>trainSet) === "all", await p.evaluate(()=>trainSet));
  t("рівні сховані поза CEFR", await p.isHidden("#tm-levels"));

  // 6. Enter стартує гру обраним набором і напрямком
  await p.keyboard.press("Enter"); await p.waitForTimeout(500);
  t("гра стартувала", await p.isVisible("#game"));
  t("напрямок узято з модалки", await p.evaluate(()=>mode) === d2, await p.evaluate(()=>mode));
  await p.evaluate(()=>endGame(true)); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById("end-screen").classList.add("hidden");
                         document.getElementById("start-screen").classList.remove("hidden"); });

  // 7. вибір запам'ятовується між сесіями
  await p.reload(); await p.waitForTimeout(1000);
  const saved = await p.evaluate(()=>({ set: trainSet, dir: trainDir }));
  t("вибір збережено", saved.set === "all" && saved.dir === d2, JSON.stringify(saved));

  // 8. CEFR-набір дає тег для лідерборду
  const tagged = await p.evaluate(() => {
    trainSet = "cefr"; cefrSel = new Set(["C2"]);
    startTraining();
    const tag = timedPoolTag; endGame(true); return tag;
  });
  t("CEFR-гра має тег рівня", /^cefr:/.test(String(tagged)), String(tagged));

  // 9. плашка боргу з'являється, коли є що повторювати
  await p.reload(); await p.waitForTimeout(900);
  const banner = await p.evaluate(() => {
    localStorage.setItem("oxford_due_v1", JSON.stringify({ [wordKey(WORDS[0])]: { due: "2000-01-01", waited: 0 } }));
    renderDueBanner();
    const el = document.getElementById("due-banner");
    return { hidden: el.classList.contains("hidden"), txt: el.textContent };
  });
  t("плашка боргу показується", !banner.hidden && /повторенні 1 слово/.test(banner.txt), banner.txt);

  console.log("✅ " + ok.length + " перевірок пройдено");
  if (bad.length) console.log("❌ ПРОВАЛЕНО:\n - " + bad.join("\n - "));
  console.log(errs.length ? "❌ помилки консолі:\n - " + errs.slice(0,4).join("\n - ") : "✅ 0 помилок консолі");
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
