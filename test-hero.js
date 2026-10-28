// Тест «🧙 Герой» (сесія 61): герой на смужці рівня, екран героя, звання, спорядження, характеристики.
// Запуск: npm i playwright-core && node test-hero.js
const fs = require("fs"), path = require("path");
const PAGE = "file://" + path.join(__dirname, "index.html");
function chromium(){ for (const t of [process.env.PW_CORE,"playwright-core"].filter(Boolean)) { try { return require(t).chromium; } catch(e){} }
  console.log("⚠️  npm i playwright-core"); process.exit(2); }
function exe(){ const d=fs.readdirSync("/opt/pw-browsers").find(x=>/^chromium-\d/.test(x));
  if(!d){console.log("⚠️  немає Chromium");process.exit(2);} return "/opt/pw-browsers/"+d+"/chrome-linux/chrome"; }

(async () => {
  const b = await chromium().launch({ executablePath: exe(), args:["--no-sandbox"] });
  const p = await b.newPage({ viewport:{width:1500,height:1000} }); const errs=[];
  p.addInitScript(() => { window.__QUEST_CHANCE = { phrase: 0, side: 0 }; });   // сесія 64: фраза/квест — випадкові, тут вимкнено
  p.on("pageerror", e=>errs.push(e.message));
  p.on("console", m=>{ if (m.type()==="error") errs.push(m.text()); });
  await p.goto(PAGE); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  const ok=[],bad=[]; const t=(n,c,x="")=>(c?ok:bad).push(n+(x?" — "+x:""));

  // Сід: 30 168 XP (рівень 8 «Воїн»), 45 слів у «Знаю», активність лише 3 дні тому
  await p.evaluate(() => {
    const m = {}, seen = new Set(); let n = 0;
    for (const w of WORDS) { const k = wordKey(w); if (seen.has(k)) continue; seen.add(k); if (n++ < 45) m[k] = { s: 3, c: 3, w: 0 }; }
    localStorage.setItem("oxford_word_mastery_v1", JSON.stringify(m));
    const d = new Date(); d.setDate(d.getDate() - 3);
    const k3 = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    localStorage.setItem("oxford_days_v1", JSON.stringify({ [k3]: { games: 2, correct: 10, wrong: 3, skipped: 0, reviewCorrect: 4 } }));
    localStorage.setItem("oxford_xp_v1", "41900");   // сесія 64: пороги ×250/180 (було 30168)
  });
  await p.reload(); await p.waitForTimeout(1200);

  // 1. Смужка рівня = герой
  const strip = await p.evaluate(() => ({
    name: document.getElementById("xp-name").textContent,
    num: document.getElementById("xp-hex-num").textContent,
    ava: !!document.querySelector("#xp-hex-ava svg.hero-svg"),
    oldIcons: typeof LEVEL_ICONS !== "undefined",
    names: XP_LEVELS.map(x => x[1]).join(",")
  }));
  t("смужка рівня показує звання героя «Воїн»", strip.name === "Воїн", strip.name);
  t("номер рівня — бейдж у шестикутнику", strip.num === "8", strip.num);
  t("у шестикутнику — аватар героя (SVG)", strip.ava);
  t("старих космічних назв і іконок нема", !strip.oldIcons && !/Струни|Родина|Мультивсесвіт/.test(strip.names), strip.names);
  t("20 звань від «Новачок» до «Безсмертний»", strip.names.split(",").length === 20 && strip.names.startsWith("Новачок") && strip.names.endsWith("Безсмертний"));
  t("прототипів «Світ слів» (сад/місто) більше нема", await p.evaluate(() =>
    !document.getElementById("world-btn") && !document.getElementById("world-overlay") && !document.getElementById("levels-overlay")
    && typeof renderGarden === "undefined" && typeof renderCity === "undefined"));

  // 2. Клік по смужці відкриває героя
  await p.click("#xp-section"); await p.waitForTimeout(300);
  t("клік по смужці рівня відкриває екран героя", await p.isVisible("#hero-overlay"));
  const h = await p.evaluate(() => ({
    cls: document.querySelector(".h-cls").textContent,
    lvl: document.querySelector(".h-lvl").textContent,
    big: !!document.querySelector(".h-ava svg.hero-svg"),
    ranks: document.querySelectorAll(".h-rank").length,
    cur: (document.querySelector(".h-rank.cur .r-name") || {}).textContent || "",
    gear: document.querySelectorAll(".h-item").length,
    gearSvg: document.querySelectorAll(".h-item svg.gear-svg").length,
    gearOk: HERO_GEAR.every((g, i) => document.querySelectorAll(".h-item")[i].classList.contains("locked") === (worldAchLevel(g.ach) === 0)),
    stats: document.querySelectorAll(".h-stat").length,
    power: document.querySelector(".h-power b").textContent,
    sumLv: [...document.querySelectorAll(".h-stat .s-lv")].reduce((a, e) => a + +e.textContent.replace(/\D/g, ""), 0),
    know: [...document.querySelectorAll(".h-stat")].find(e => /Інтелект/.test(e.textContent)).querySelector(".s-v").textContent,
    tired: /Втома/.test(document.querySelector(".h-buffs").textContent)
  }));
  t("звання на картці героя — «Воїн»", h.cls === "Воїн", h.cls);
  t("рівень 8 — клас «Слідопит», срібна ліга", /Рівень 8/.test(h.lvl) && /Слідопит/.test(h.lvl) && /Срібна/.test(h.lvl), h.lvl);
  t("великий малюнок героя (SVG)", h.big);
  t("«Шлях героя» — усі 20 звань", h.ranks === 20, String(h.ranks));
  t("у «Шляху героя» підсвічено поточне звання", /Воїн/.test(h.cur), h.cur);
  t("8 предметів спорядження, кожен — SVG-малюнок", h.gear === 8 && h.gearSvg === 8, h.gear + " / " + h.gearSvg);
  t("ще не здобуті предмети — «дерев'яні» = ачівки без ліги", h.gearOk);
  t("15 характеристик із «Загальної статистики» (🔁 Наполегливість прибрано, сесія 63)", h.stats === 15, String(h.stats));
  t("Міць = сума рівнів характеристик", +h.power === h.sumLv, h.power + " / " + h.sumLv);
  t("Інтелект = слова в «Знаю» (45)", /^45/.test(h.know), h.know);
  t("3 дні без занять → стан «Втома»", h.tired);

  // 3. Клавіатура: Enter не стартує похід позаду (з сесії 64 Enter у меню = похід), Esc закриває
  await p.keyboard.press("Enter"); await p.waitForTimeout(250);
  t("Enter на екрані героя НЕ стартує похід позаду", !(await p.isVisible("#quest-overlay")) && !(await p.isVisible("#train-modal")));
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  t("Esc закриває екран героя", !(await p.isVisible("#hero-overlay")));
  await p.keyboard.press("Enter"); await p.waitForTimeout(250);
  t("після закриття Enter стартує похід", await p.isVisible("#quest-overlay"));
  await p.evaluate(() => questClose(false)); await p.waitForTimeout(200);

  // 4. Клас змінюється з рівнем; гра сьогодні знімає втому
  await p.evaluate(() => {
    localStorage.setItem("oxford_xp_v1", "104200");
    const days = JSON.parse(localStorage.getItem("oxford_days_v1"));
    days[todayKey()] = { games: 1, correct: 5, wrong: 1, skipped: 0 };
    localStorage.setItem("oxford_days_v1", JSON.stringify(days));
  });
  await p.reload(); await p.waitForTimeout(1200);
  t("75 000 XP → звання «Маг» на смужці", await p.textContent("#xp-name") === "Маг");
  await p.click("#xp-section"); await p.waitForTimeout(300);
  const h2 = await p.evaluate(() => ({ lvl: document.querySelector(".h-lvl").textContent, buffs: document.querySelector(".h-buffs").textContent }));
  t("рівень 13 — клас «Маг», діамантова ліга", /Рівень 13/.test(h2.lvl) && /клас «Маг»/.test(h2.lvl) && /Діамантова/.test(h2.lvl), h2.lvl);
  t("гра сьогодні → «Бадьорий», без «Втоми»", /Бадьорий/.test(h2.buffs) && !/Втома/.test(h2.buffs), h2.buffs);
  await p.mouse.click(10, 500); await p.waitForTimeout(200);
  t("клік по фону закриває екран героя", !(await p.isVisible("#hero-overlay")));

  console.log(bad.length ? "❌ ПРОВАЛЕНО:\n  " + bad.join("\n  ") : "✅ " + ok.length + " перевірок пройдено");
  console.log(errs.length ? "❌ помилки консолі:\n  " + errs.join("\n  ") : "✅ 0 помилок консолі");
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})();
