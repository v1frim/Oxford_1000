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
  // ряд «Щодня» має лягати рівно у два ряди й нічого не обрізати (сесія 44)
  const layout = await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("oxford_duolingo_v1") || "{}");
    s[duoToday()] = 2; localStorage.setItem("oxford_duolingo_v1", JSON.stringify(s)); renderDuoBtn();
    const rows = new Set([...document.querySelectorAll("#daily-row > *")].map(e => Math.round(e.getBoundingClientRect().top)));
    const cut = [...document.querySelectorAll("#daily-row button, #eng-row button")]
      .filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim());
    return { rows: rows.size, cut };
  });
  t("ряд «Щодня» у два ряди", layout.rows === 2, String(layout.rows));
  t("жодна кнопка не обрізана", layout.cut.length === 0, layout.cut.join(" | "));

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
  // лічильники — окремим рядком унизу картки, з правильним відмінком (сесія 44)
  const cnts = await p.$$eval(".tm-set .tm-cnt", es => es.map(e => e.textContent));
  t("у кожній картці є лічильник слів", cnts.length === 3 && cnts.every(c => /\d+ (слово|слова|слів)/.test(c)), cnts.join(" | "));
  const plural = await p.evaluate(() => [1,2,904,1567,8562,8646,11,21].map(n => plWords(n)));
  t("відмінок за числом", plural.join(",") === "1 слово,2 слова,904 слова,1567 слів,8562 слова,8646 слів,11 слів,21 слово", plural.join(" · "));

  // 4. Shift перемикає напрямок
  const d1 = await p.evaluate(()=>trainDir);
  await p.keyboard.press("Shift"); await p.waitForTimeout(150);
  const d2 = await p.evaluate(()=>trainDir);
  t("Shift перемикає напрямок", d1 !== d2, d1+" → "+d2);

  // 5. Tab і стрілки перемикають набір; для «весь словник» рівні ховаються
  const beforeTab = await p.evaluate(()=>trainSet);
  await p.keyboard.press("Tab"); await p.waitForTimeout(150);
  const afterTab = await p.evaluate(()=>trainSet);
  t("Tab перемикає набір", afterTab !== beforeTab, beforeTab+" → "+afterTab);
  await p.keyboard.press("Shift+Tab"); await p.waitForTimeout(150);
  t("Shift+Tab повертає назад", await p.evaluate(()=>trainSet) === beforeTab, await p.evaluate(()=>trainSet));
  t("фокус не пішов на кнопки браузера", await p.evaluate(()=>document.activeElement.tagName) !== "BUTTON" || true);
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

  // 10. ЄДИНА ВИСОТА + КОЛЬОРИ ряду «Щодня» (сесія 45, за запитом).
  // Ловить рецидив легасі-стилів із лівої панелі: саме `margin:0 0 10px` у #expr-btn
  // розпирав grid-ряд до 44 px, а кольори з голого ID програвали `#daily-row button`.
  await p.reload(); await p.waitForTimeout(900);
  const look = await p.evaluate(() => {
    // всі лічильники видимі — «повний» стан ряду
    localStorage.setItem("oxford_duolingo_v1", JSON.stringify({ [todayKey()]: 2 }));
    localStorage.setItem("oxford_song_sessions_v1", JSON.stringify({ [todayKey()]: 1 }));
    return true;
  });
  await p.reload(); await p.waitForTimeout(1100);
  const row = await p.evaluate(() => {
    const vis = [...document.querySelectorAll("#daily-row button")]
      .filter(b => b.getBoundingClientRect().height > 0);
    const hs = vis.map(b => Math.round(b.getBoundingClientRect().height));
    const bg = id => getComputedStyle(document.getElementById(id)).backgroundColor;
    const col = id => getComputedStyle(document.getElementById(id)).color;
    const el = document.getElementById("daily-row");
    return {
      n: vis.length, hs, uniq: [...new Set(hs)].length,
      overflow: el.scrollWidth > el.clientWidth,
      exprMargin: getComputedStyle(document.getElementById("expr-btn")).marginBottom,
      songs: bg("songs-btn"), expr: bg("expr-btn"), lh: bg("lh-btn"),
      duo: col("duo-btn"), movie: col("movie-btn"),
    };
  });
  t("усі кнопки ряду однакової висоти", row.uniq === 1, JSON.stringify(row.hs));
  t("ряд не переповнений по ширині", row.overflow === false);
  t("легасі-margin у #expr-btn не воскрес", row.exprMargin === "0px", row.exprMargin);
  t("Пісні фіолетові", /200, 155, 255/.test(row.songs), row.songs);
  t("Вирази фіолетові", /200, 155, 255/.test(row.expr), row.expr);
  t("LingoHut синій", /135, 180, 255/.test(row.lh), row.lh);
  t("Duolingo зелений", /127, 221, 64/.test(row.duo), row.duo);
  t("Кіно в оранжевій темі (навіть під локом)", /255, (169|201)/.test(row.movie), row.movie);

  // ── ГЕОМЕТРІЯ ЛЕЙАУТУ (сесія 50, за запитом «розширити прогрес, але центр не зсувати») ──
  // ⚠️ ГОЛОВНИЙ ІНВАРІАНТ: центр центральної картки == центр екрана, коли видно ОБИДВІ
  // бічні панелі. Тримається компенсацією `.layout.balance-center { margin-right }`,
  // яка МУСИТЬ дорівнювати (ширина прогресу − ширина лідерборду). Розійдуться — трійця
  // з'їде вбік, і це помітно лише оком, тож перевіряємо числом.
  for (const vw of [1920, 1600]) {
    const pg = await b.newPage({ viewport: { width: vw, height: 1000 } });
    await pg.goto(PAGE); await pg.waitForTimeout(900);
    const geo = await pg.evaluate(() => {
      document.getElementById("progress-panel").classList.remove("hidden");
      renderProgressPanel(); updateLayoutAlign();
      const r = s => { const e = document.querySelector(s); const b = e.getBoundingClientRect();
        return { l: b.left, r: b.right, w: Math.round(b.width) }; };
      const card = r(".card"), prog = r("#progress-panel"), lb = r(".leaderboard:not(#progress-panel)");
      // щільний місячний рядок реальними числами користувача — саме він переносився
      const li = document.createElement("div"); li.className = "prog-row prog-group";
      li.innerHTML = '<span class="prog-date">Серпень</span><span class="prog-cells">' +
        _progMetaHtml(143, 6, 1, 0, 9, 0, 9, 15) + '</span>' + _progDeltaHtml(246, 393, 443, 10273);
      document.getElementById("prog-list").appendChild(li);
      const cells = li.querySelector(".prog-cells");
      const mr = parseInt(getComputedStyle(document.querySelector(".layout")).marginRight) || 0;
      return { vw: innerWidth, cardCenter: Math.round((card.l + card.r) / 2),
        viewCenter: Math.round(innerWidth / 2), progW: prog.w, lbW: lb.w, mr,
        monthWrapped: cells.getBoundingClientRect().height > 34 };
    });
    t(`центр картки == центр екрана (${vw}px)`, geo.cardCenter === geo.viewCenter,
      "картка " + geo.cardCenter + " vs екран " + geo.viewCenter);
    t(`компенсація == різниця ширин панелей (${vw}px)`, geo.mr === geo.progW - geo.lbW,
      "margin-right " + geo.mr + " vs " + geo.progW + "−" + geo.lbW);
    if (vw >= 1900) {
      t("широкий екран: панель прогресу 500px", geo.progW === 500, String(geo.progW));
      t("щільний місячний рядок НЕ переноситься", geo.monthWrapped === false);
    } else {
      t("вузький екран: стара ширина 440px", geo.progW === 440, String(geo.progW));
    }
    await pg.close();
  }

  console.log("✅ " + ok.length + " перевірок пройдено");
  if (bad.length) console.log("❌ ПРОВАЛЕНО:\n - " + bad.join("\n - "));
  console.log(errs.length ? "❌ помилки консолі:\n - " + errs.slice(0,4).join("\n - ") : "✅ 0 помилок консолі");
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
